import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Salon from "@/models/Salon";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { sendOtpEmail } from "@/lib/mailer";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

/**
 * POST /api/auth/send-registration-otp
 * Body: { email }
 * Header: X-Salon-ID
 *
 * Validates that the email is not already registered for this salon,
 * generates a 6-digit OTP, stores it hashed-in-DB and emails it to the user.
 * The OTP is valid for 10 minutes.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const salonId = req.headers.get("X-Salon-ID");
    if (!salonId) return errorResponse("Salon context missing.", 400);

    const salon = await Salon.findById(salonId);
    if (!salon || !salon.isActive) return errorResponse("Salon not found or inactive.", 404);

    const body = await req.json();
    const email = (body.email || "").toLowerCase().trim();
    if (!email) return errorResponse("email is required", 422);

    // Reject if already registered in this salon
    const existing = await User.findOne({ email, salonId });
    if (existing) {
      return errorResponse("An account with this email already exists for this salon.", 409);
    }

    // Invalidate old OTPs for this email
    await Otp.deleteMany({ email });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min
      used: false,
    });

    await sendOtpEmail(email, otp, "registration");

    return successResponse(null, "OTP sent to your email. Please check your inbox.");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

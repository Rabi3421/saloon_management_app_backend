import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

/**
 * POST /api/auth/forgot-password
 * Body: { email }
 *
 * Generates a 6-digit OTP valid for 10 minutes and logs it to the console
 * (replace the console.log with your email provider — Resend, Nodemailer, etc.)
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email } = await req.json();

    if (!email) return errorResponse("email is required", 422);

    const user = await User.findOne({ email: email.toLowerCase() });
    // Return success even if user not found — prevents email enumeration
    if (!user) {
      return successResponse(null, "If this email is registered, an OTP has been sent.");
    }

    // Invalidate any existing OTPs for this email
    await Otp.deleteMany({ email: email.toLowerCase() });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await Otp.create({ email: email.toLowerCase(), otp, expiresAt });

    // ⚠️  Replace this with your real email sending logic:
    // await sendEmail({ to: email, subject: "Your OTP", body: `Your OTP is: ${otp}` });
    console.log(`[OTP] ${email} → ${otp} (expires ${expiresAt.toISOString()})`);

    return successResponse({ otp_hint: otp }, "OTP sent successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Otp from "@/models/Otp";
import { signToken } from "@/lib/jwt";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

/**
 * POST /api/auth/verify-otp
 * Body: { email, otp }
 *
 * Validates the OTP and returns a short-lived reset token (valid 15 min).
 * The client must pass this token to /api/auth/reset-password.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, otp } = await req.json();

    if (!email || !otp) return errorResponse("email and otp are required", 422);

    const record = await Otp.findOne({
      email: email.toLowerCase(),
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!record || record.otp !== otp) {
      return errorResponse("Invalid or expired OTP", 400);
    }

    // Mark OTP as used
    record.used = true;
    await record.save();

    // Issue a special reset token (reusing JWT with role = "reset")
    const resetToken = signToken({
      userId: email.toLowerCase(), // store email as userId for lookup
      salonId: null,
      role: "reset" as never,
      email: email.toLowerCase(),
    });

    return successResponse({ resetToken }, "OTP verified. Use the resetToken to set a new password.");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

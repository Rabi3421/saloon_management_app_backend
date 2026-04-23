import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { verifyToken } from "@/lib/jwt";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

/**
 * POST /api/auth/reset-password
 * Body: { resetToken, newPassword }
 *
 * Validates the reset token from /api/auth/verify-otp and updates the password.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { resetToken, newPassword } = await req.json();

    if (!resetToken || !newPassword) {
      return errorResponse("resetToken and newPassword are required", 422);
    }
    if (newPassword.length < 6) {
      return errorResponse("Password must be at least 6 characters", 422);
    }

    // Decode the reset token
    const payload = verifyToken(resetToken);
    if (!payload || (payload.role as string) !== "reset") {
      return errorResponse("Invalid or expired reset token", 401);
    }

    const email = payload.email;
    const user = await User.findOne({ email });
    if (!user) return errorResponse("User not found", 404);

    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    return successResponse(null, "Password reset successfully. You can now log in.");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

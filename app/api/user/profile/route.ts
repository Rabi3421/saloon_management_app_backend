import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

/**
 * GET /api/user/profile
 * Returns the logged-in user's own profile.
 */
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const user = await User.findById(auth.payload.userId).select("-password");
    if (!user) return errorResponse("User not found", 404);
    return successResponse(user, "Profile fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

/**
 * PUT /api/user/profile
 * Lets the logged-in user update their own name, phone, and password.
 */
export async function PUT(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const body = await req.json();

    // Prevent role/salonId escalation
    const { name, phone, currentPassword, newPassword } = body;
    const updates: Record<string, string> = {};

    if (name) updates.name = name;
    if (phone) updates.phone = phone;

    // Password change flow
    if (newPassword) {
      if (!currentPassword) {
        return errorResponse("Current password is required to set a new password", 422);
      }
      if (newPassword.length < 6) {
        return errorResponse("New password must be at least 6 characters", 422);
      }

      const user = await User.findById(auth.payload.userId).select("+password");
      if (!user) return errorResponse("User not found", 404);

      const valid = await bcrypt.compare(currentPassword, user.password);
      if (!valid) return errorResponse("Current password is incorrect", 401);

      updates.password = await bcrypt.hash(newPassword, 12);
    }

    const updated = await User.findByIdAndUpdate(
      auth.payload.userId,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updated) return errorResponse("User not found", 404);

    return successResponse(updated, "Profile updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { authenticate, isAuthError, requireRole } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;

    const user = await User.findById(id)
      .select("-password")
      .populate("salonId", "name email phone");
    if (!user) return errorResponse("User not found", 404);

    return successResponse(user, "User fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function PUT(req: NextRequest, { params }: Context) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    // Admin can set a new password for any non-admin user
    if (body.newPassword) {
      const target = await User.findById(id);
      if (!target) return errorResponse("User not found", 404);
      if (target.role === "admin") return errorResponse("Cannot reset another admin's password", 403);
      body.password = await bcrypt.hash(body.newPassword, 12);
    }
    delete body.newPassword;

    // Prevent role escalation to admin
    if (body.role === "admin") delete body.role;

    const user = await User.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) return errorResponse("User not found", 404);

    return successResponse(user, "User updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

/**
 * DELETE /api/admin/users/:id
 * Permanently deletes a non-admin user.
 */
export async function DELETE(req: NextRequest, { params }: Context) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;

    const user = await User.findById(id);
    if (!user) return errorResponse("User not found", 404);
    if (user.role === "admin") return errorResponse("Cannot delete another admin account", 403);

    await User.findByIdAndDelete(id);

    return successResponse(null, "User deleted");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

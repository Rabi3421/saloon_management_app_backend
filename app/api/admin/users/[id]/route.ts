import { NextRequest } from "next/server";
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

    // Prevent admin from changing another admin's password via this route
    delete body.password;
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

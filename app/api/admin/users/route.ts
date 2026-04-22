import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { authenticate, isAuthError, requireRole } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "";
    const salonId = searchParams.get("salonId") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { role: { $ne: "admin" } };
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }
    if (role) filter.role = role;
    if (salonId) filter.salonId = salonId;

    const users = await User.find(filter)
      .select("-password")
      .populate("salonId", "name email")
      .sort({ createdAt: -1 });

    return successResponse(users, "Users fetched");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

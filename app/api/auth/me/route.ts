import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Salon from "@/models/Salon";
import { authenticate, isAuthError } from "@/middleware/auth";
import { errorResponse, successResponse } from "@/lib/apiHelpers";

/**
 * GET /api/auth/me
 * Dashboard session bootstrap using cookie auth.
 */
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();

    const user = await User.findById(auth.payload.userId).select("-password");
    if (!user || !user.isActive) return errorResponse("User not found", 404);

    const salon = user.salonId ? await Salon.findById(user.salonId) : null;

    return successResponse({ user, salon }, "Session fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

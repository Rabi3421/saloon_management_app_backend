import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { errorResponse, successResponse } from "@/lib/apiHelpers";
import {
  DASHBOARD_REFRESH_COOKIE,
  setDashboardAuthCookies,
} from "@/lib/authCookies";
import { verifyRefreshToken } from "@/lib/jwt";

/**
 * POST /api/auth/refresh
 * Dashboard only: rotates access+refresh cookies using the refresh cookie.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const refreshToken = req.cookies.get(DASHBOARD_REFRESH_COOKIE)?.value;
    if (!refreshToken) return errorResponse("Refresh token missing", 401);

    const payload = verifyRefreshToken(refreshToken);
    if (payload.tokenType && payload.tokenType !== "refresh") {
      return errorResponse("Invalid refresh token", 401);
    }

    if (payload.role === "admin") {
      return errorResponse("Refresh is not enabled for admin panel", 403);
    }

    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) return errorResponse("User not found or inactive", 401);

    const response = successResponse(null, "Token refreshed");
    setDashboardAuthCookies(response, {
      userId: String(user._id),
      salonId: user.salonId ? String(user.salonId) : null,
      role: user.role,
      email: user.email,
    });

    return response;
  } catch {
    return errorResponse("Invalid or expired refresh token", 401);
  }
}

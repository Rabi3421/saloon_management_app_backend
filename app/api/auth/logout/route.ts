import { NextRequest } from "next/server";
import { successResponse } from "@/lib/apiHelpers";
import { clearDashboardAuthCookies } from "@/lib/authCookies";

/**
 * POST /api/auth/logout
 * Dashboard logout: clears httpOnly access/refresh cookies.
 */
export async function POST(_req: NextRequest) {
  const response = successResponse(null, "Logged out");
  clearDashboardAuthCookies(response);
  return response;
}

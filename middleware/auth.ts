import { NextRequest } from "next/server";
import { verifyAccessToken, verifyToken, JwtPayload } from "@/lib/jwt";
import { errorResponse } from "@/lib/apiHelpers";
import { DASHBOARD_ACCESS_COOKIE } from "@/lib/authCookies";

/**
 * Extracts and verifies the Bearer token from the Authorization header.
 * Returns the decoded payload or a NextResponse error.
 */
export function authenticate(
  req: NextRequest
): { payload: JwtPayload } | ReturnType<typeof errorResponse> {
  const authHeader = req.headers.get("authorization");
  const bearerToken =
    authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;
  const cookieToken = req.cookies.get(DASHBOARD_ACCESS_COOKIE)?.value;
  const token = bearerToken || cookieToken;

  if (!token) {
    return errorResponse("Authorization token is missing or malformed", 401);
  }

  try {
    const payload = bearerToken ? verifyToken(token) : verifyAccessToken(token);

    // ── Salon isolation guard ────────────────────────────────────────────────
    // Admin accounts (salonId: null) are exempt — they operate across salons.
    // For every other role, the salonId baked into the JWT must match the
    // X-Salon-ID header sent by the client app.  This prevents a user who
    // registered with Salon A from calling Salon B's deployed instance.
    if (payload.role !== "admin" && payload.salonId !== null) {
      const headerSalonId = req.headers.get("x-salon-id");
      if (!headerSalonId) {
        return errorResponse("X-Salon-ID header is required", 400);
      }
      if (headerSalonId !== payload.salonId) {
        return errorResponse(
          "Access denied: you are not a member of this salon",
          403
        );
      }
    }
    // ────────────────────────────────────────────────────────────────────────

    return { payload };
  } catch {
    return errorResponse("Invalid or expired token", 401);
  }
}

/**
 * Narrows the result of `authenticate` to check if it's an error response.
 */
export function isAuthError(
  result: ReturnType<typeof authenticate>
): result is ReturnType<typeof errorResponse> {
  return "payload" in result === false;
}

/**
 * Role-based access guard.
 */
export function requireRole(
  payload: JwtPayload,
  allowedRoles: string[]
): ReturnType<typeof errorResponse> | null {
  if (!allowedRoles.includes(payload.role)) {
    return errorResponse(
      `Access denied. Required role: ${allowedRoles.join(" or ")}`,
      403
    );
  }
  return null;
}

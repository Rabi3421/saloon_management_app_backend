import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { DASHBOARD_ACCESS_COOKIE, DASHBOARD_REFRESH_COOKIE } from "@/lib/authCookies";

const DASHBOARD_PROTECTED = "/dashboard";
const ADMIN_PROTECTED = "/admin";
const ADMIN_LOGIN = "/admin/login";
const ADMIN_SETUP = "/admin/setup";
const AUTH_PAGES = ["/register"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isDashboardProtected = pathname.startsWith(DASHBOARD_PROTECTED);
  // Admin panel pages (exclude /admin/login and /admin/setup — public admin routes)
  const isAdminProtected =
    pathname.startsWith(ADMIN_PROTECTED) &&
    pathname !== ADMIN_LOGIN &&
    !pathname.startsWith(ADMIN_LOGIN + "/") &&
    pathname !== ADMIN_SETUP &&
    !pathname.startsWith(ADMIN_SETUP + "/");

  const isAuthPage = AUTH_PAGES.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const accessToken = request.cookies.get(DASHBOARD_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(DASHBOARD_REFRESH_COOKIE)?.value;

  // ----- Dashboard protected routes -----
  if (isDashboardProtected) {
    if (accessToken) return NextResponse.next();

    if (refreshToken) {
      const refreshUrl = new URL("/api/auth/refresh", request.url);
      const refreshRes = await fetch(refreshUrl.toString(), {
        method: "POST",
        headers: { cookie: request.headers.get("cookie") || "" },
      });

      if (refreshRes.ok) {
        const response = NextResponse.next();
        refreshRes.headers.getSetCookie().forEach((cookie) => {
          response.headers.append("Set-Cookie", cookie);
        });
        return response;
      }
    }

    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // ----- Admin panel protected routes -----
  // Admin uses localStorage token — middleware can only check cookie presence.
  // For admin we simply let the client-side AdminSidebar/pages handle the redirect.
  // (If admin_token is absent, AdminSidebar redirects to /admin/login.)
  // This block is a no-op for now but keeps the intent explicit.
  if (isAdminProtected) {
    return NextResponse.next();
  }

  // ----- Auth pages (login/register) -----
  if (isAuthPage && accessToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};

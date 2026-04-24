import { NextResponse } from "next/server";
import {
  JwtPayload,
  signAccessToken,
  signRefreshToken,
} from "@/lib/jwt";

export const DASHBOARD_ACCESS_COOKIE = "dashboard_access_token";
export const DASHBOARD_REFRESH_COOKIE = "dashboard_refresh_token";

const isProd = process.env.NODE_ENV === "production";

export function setDashboardAuthCookies(response: NextResponse, payload: JwtPayload) {
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);

  response.cookies.set(DASHBOARD_ACCESS_COOKIE, accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60,
  });

  response.cookies.set(DASHBOARD_REFRESH_COOKIE, refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });
}

export function clearDashboardAuthCookies(response: NextResponse) {
  response.cookies.set(DASHBOARD_ACCESS_COOKIE, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  response.cookies.set(DASHBOARD_REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

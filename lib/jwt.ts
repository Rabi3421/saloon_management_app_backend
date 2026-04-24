import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET as string;
const JWT_REFRESH_SECRET =
  (process.env.JWT_REFRESH_SECRET as string | undefined) || JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("Please define the JWT_SECRET environment variable in .env.local");
}

export interface JwtPayload {
  userId: string;
  salonId: string | null; // null for super-admin
  role: string;
  email: string;
  tokenType?: "access" | "refresh";
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, tokenType: "access" }, JWT_SECRET, {
    expiresIn: "15m",
  });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign({ ...payload, tokenType: "refresh" }, JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_REFRESH_SECRET) as JwtPayload;
}

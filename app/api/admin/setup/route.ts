import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { signToken } from "@/lib/jwt";
import {
  successResponse,
  errorResponse,
  validateRequiredFields,
} from "@/lib/apiHelpers";

/**
 * POST /api/admin/setup
 * One-time super-admin account creation.
 * Returns 409 if an admin already exists — no second admin can ever be created.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Block if admin already exists
    const existing = await User.findOne({ role: "admin" });
    if (existing) {
      return errorResponse(
        "Super-admin account already exists. Only one admin is allowed.",
        409
      );
    }

    const body = await req.json();
    const missingField = validateRequiredFields(body, [
      "name",
      "email",
      "password",
    ]);
    if (missingField) return errorResponse(missingField, 422);

    const { name, email, password } = body;

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "admin",
      salonId: null,
      isActive: true,
    });

    const token = signToken({
      userId: String(admin._id),
      salonId: null,
      role: "admin",
      email: admin.email,
    });

    return successResponse(
      { token, admin },
      "Super-admin account created successfully",
      201
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

/**
 * GET /api/admin/setup
 * Check whether an admin account exists (used by setup page to redirect).
 */
export async function GET() {
  try {
    await connectDB();
    const exists = await User.exists({ role: "admin" });
    return successResponse({ exists: !!exists }, "OK");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

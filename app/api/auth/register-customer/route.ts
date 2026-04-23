import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Salon from "@/models/Salon";
import User from "@/models/User";
import Otp from "@/models/Otp";
import { signToken } from "@/lib/jwt";
import {
  successResponse,
  errorResponse,
  validateRequiredFields,
} from "@/lib/apiHelpers";

/**
 * POST /api/auth/register-customer
 *
 * Registers a customer account scoped to a specific salon.
 * Requires a verified OTP — the client must call /api/auth/send-registration-otp
 * first, then submit the code here alongside the registration details.
 *
 * Body: { name, email, password, otp, phone? }
 * Header: X-Salon-ID
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Identify which salon this registration is for
    const salonId = req.headers.get("X-Salon-ID");
    if (!salonId) {
      return errorResponse(
        "Salon context missing. Make sure NEXT_PUBLIC_SALON_ID is set in your deployment.",
        400
      );
    }

    // Validate the salon exists and is active
    const salon = await Salon.findById(salonId);
    if (!salon || !salon.isActive) {
      return errorResponse("Salon not found or inactive.", 404);
    }

    const body = await req.json();

    const missingField = validateRequiredFields(body, ["name", "email", "password", "otp"]);
    if (missingField) return errorResponse(missingField, 422);

    const { name, email, phone, password, otp } = body;
    const normalizedEmail = email.toLowerCase().trim();

    // ── Verify OTP ──────────────────────────────────────────────────────────
    const otpRecord = await Otp.findOne({
      email: normalizedEmail,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!otpRecord || otpRecord.otp !== String(otp)) {
      return errorResponse("Invalid or expired OTP. Please request a new one.", 400);
    }

    // Mark OTP as used immediately to prevent replay
    otpRecord.used = true;
    await otpRecord.save();

    // Check duplicate email within this salon
    const existingUser = await User.findOne({ email: normalizedEmail, salonId });
    if (existingUser) {
      return errorResponse(
        "An account with this email already exists for this salon.",
        409
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      salonId,
      name,
      email: normalizedEmail,
      phone: phone || "",
      password: hashedPassword,
      role: "customer",
    });

    const token = signToken({
      userId: String(user._id),
      salonId: String(salonId),
      role: user.role,
      email: user.email,
    });

    return successResponse(
      { token, user, salon },
      "Registration successful",
      201
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/auth/register-customer
 *
 * Registers a customer (or staff) account scoped to a specific salon.
 * The salon is identified by the `X-Salon-ID` request header, which each
 * deployed salon frontend sets via the NEXT_PUBLIC_SALON_ID env variable.
 *
 * This way, the same backend serves multiple salon frontends — each user
 * that registers is automatically assigned to the correct salon.
 */
export async function POST(req: NextRequest) {
  try {
    await connectDB();

    // Identify which salon this registration is for
    const salonId = req.headers.get("X-Salon-ID");
    if (!salonId) {
      return errorResponse(
        "Salon context missing. Make sure NEXT_PUBLIC_SALON_ID is set in your deployment.",
        400
      );
    }

    // Validate the salon exists and is active
    const salon = await Salon.findById(salonId);
    if (!salon || !salon.isActive) {
      return errorResponse("Salon not found or inactive.", 404);
    }

    const body = await req.json();

    const missingField = validateRequiredFields(body, [
      "name",
      "email",
      "password",
    ]);
    if (missingField) return errorResponse(missingField, 422);

    const { name, email, phone, password } = body;

    // Check duplicate email within this salon
    const existingUser = await User.findOne({
      email: email.toLowerCase(),
      salonId,
    });
    if (existingUser) {
      return errorResponse(
        "An account with this email already exists for this salon.",
        409
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      salonId,
      name,
      email: email.toLowerCase(),
      phone: phone || "",
      password: hashedPassword,
      role: "customer",
    });

    const token = signToken({
      userId: String(user._id),
      salonId: String(salonId),
      role: user.role,
      email: user.email,
    });

    return successResponse(
      { token, user, salon },
      "Registration successful",
      201
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

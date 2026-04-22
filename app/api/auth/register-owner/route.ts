import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Salon from "@/models/Salon";
import User from "@/models/User";
import { signToken } from "@/lib/jwt";
import {
  successResponse,
  errorResponse,
  validateRequiredFields,
} from "@/lib/apiHelpers";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const missingField = validateRequiredFields(body, [
      "salonName",
      "ownerName",
      "email",
      "phone",
      "address",
      "password",
    ]);
    if (missingField) return errorResponse(missingField, 422);

    const { salonName, ownerName, email, phone, address, password, plan } = body;

    // Check for duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return errorResponse("An account with this email already exists", 409);
    }

    // Create salon
    const salon = await Salon.create({
      name: salonName,
      ownerName,
      email: email.toLowerCase(),
      phone,
      address,
      plan: plan || "basic",
    });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create owner user
    const user = await User.create({
      salonId: salon._id,
      name: ownerName,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      role: "owner",
    });

    const token = signToken({
      userId: String(user._id),
      salonId: String(salon._id),
      role: user.role,
      email: user.email,
    });

    return successResponse(
      {
        token,
        user,
        salon,
      },
      "Salon registered successfully",
      201
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

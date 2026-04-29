import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";
import User from "@/models/User";
import { authenticate, isAuthError } from "@/middleware/auth";
import {
  successResponse,
  errorResponse,
  validateRequiredFields,
} from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const staff = await Staff.find({
      salonId: auth.payload.salonId,
    })
      .sort({ name: 1 })
      .lean();

    return successResponse(staff, "Staff fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  if (auth.payload.role !== "owner" && auth.payload.role !== "admin") {
    return errorResponse("Only owners can add staff", 403);
  }

  try {
    await connectDB();
    const body = await req.json();

    if (!auth.payload.salonId) {
      return errorResponse("Salon context is required to create staff accounts", 400);
    }

    const missingField = validateRequiredFields(body, [
      "name",
      "specialization",
      "email",
      "password",
    ]);
    if (missingField) return errorResponse(missingField, 422);

    const normalizedEmail = String(body.email).trim().toLowerCase();
    const password = String(body.password ?? "");

    if (password.length < 6) {
      return errorResponse("Password must be at least 6 characters", 422);
    }

    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return errorResponse("A user with this email already exists", 409);
    }

    const existingStaff = await Staff.findOne({
      salonId: auth.payload.salonId,
      email: normalizedEmail,
    }).lean();
    if (existingStaff) {
      return errorResponse("This staff email is already linked to your salon", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      salonId: auth.payload.salonId,
      name: String(body.name).trim(),
      email: normalizedEmail,
      phone: String(body.phone ?? "").trim(),
      password: hashedPassword,
      role: "staff",
      isActive: body.isActive ?? true,
    });
    await user.save();

    const member = new Staff({
      name: String(body.name).trim(),
      email: normalizedEmail,
      phone: String(body.phone ?? "").trim(),
      specialization: String(body.specialization).trim(),
      workingHours: Array.isArray(body.workingHours) ? body.workingHours : [],
      userId: user._id,
      isActive: body.isActive ?? true,
      salonId: auth.payload.salonId,
    });
    await member.save();

    return successResponse(member, "Staff member added", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

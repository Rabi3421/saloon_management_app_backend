import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Salon from "@/models/Salon";
import Staff from "@/models/Staff";
import User from "@/models/User";
import { authenticate, isAuthError, requireRole } from "@/middleware/auth";
import {
  errorResponse,
  successResponse,
  validateRequiredFields,
} from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const salonId = searchParams.get("salonId")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "all";

    const filter: Record<string, unknown> = {};

    if (salonId) {
      filter.salonId = salonId;
    }

    if (status === "active") {
      filter.isActive = true;
    } else if (status === "inactive") {
      filter.isActive = false;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { specialization: { $regex: search, $options: "i" } },
      ];
    }

    const staff = await Staff.find(filter)
      .populate("salonId", "name email plan isActive")
      .populate("userId", "name email phone role isActive createdAt")
      .sort({ createdAt: -1 });

    return successResponse(staff, "Staff fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const body = await req.json();

    const missing = validateRequiredFields(body, [
      "salonId",
      "name",
      "email",
      "password",
      "specialization",
    ]);
    if (missing) return errorResponse(missing, 422);

    const salonId = String(body.salonId).trim();
    const normalizedEmail = String(body.email).trim().toLowerCase();
    const password = String(body.password ?? "").trim();

    if (password.length < 6) {
      return errorResponse("Password must be at least 6 characters", 422);
    }

    const salon = await Salon.findById(salonId).lean();
    if (!salon) {
      return errorResponse("Salon not found", 404);
    }

    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return errorResponse("A user with this email already exists", 409);
    }

    const existingStaff = await Staff.findOne({
      salonId,
      email: normalizedEmail,
    }).lean();
    if (existingStaff) {
      return errorResponse("This staff email is already linked to the selected salon", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      salonId,
      name: String(body.name).trim(),
      email: normalizedEmail,
      phone: String(body.phone ?? "").trim(),
      password: hashedPassword,
      role: "staff",
      isActive: body.isActive ?? true,
    });
    await user.save();

    const staff = new Staff({
      salonId,
      userId: user._id,
      name: String(body.name).trim(),
      email: normalizedEmail,
      phone: String(body.phone ?? "").trim(),
      specialization: String(body.specialization).trim(),
      workingHours: Array.isArray(body.workingHours) ? body.workingHours : [],
      isActive: body.isActive ?? true,
    });
    await staff.save();

    const populatedStaff = await Staff.findById(staff._id)
      .populate("salonId", "name email plan isActive")
      .populate("userId", "name email phone role isActive createdAt");

    return successResponse(populatedStaff ?? staff, "Staff account created", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
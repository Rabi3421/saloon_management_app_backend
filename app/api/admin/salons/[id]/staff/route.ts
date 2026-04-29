import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";
import Salon from "@/models/Salon";
import User from "@/models/User";
import { authenticate, isAuthError, requireRole } from "@/middleware/auth";
import { successResponse, errorResponse, validateRequiredFields } from "@/lib/apiHelpers";

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/salons/[id]/staff
 * Super-admin: add a staff member directly to any salon.
 */
export async function POST(req: NextRequest, { params }: Context) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id: salonId } = await params;

    const salon = await Salon.findById(salonId);
    if (!salon) return errorResponse("Salon not found", 404);

    const body = await req.json();
    const missing = validateRequiredFields(body, [
      "name",
      "email",
      "password",
      "specialization",
    ]);
    if (missing) return errorResponse(missing, 422);

    const normalizedEmail = String(body.email).trim().toLowerCase();
    const password = String(body.password ?? "").trim();

    if (password.length < 6) {
      return errorResponse("Password must be at least 6 characters", 422);
    }

    const existingUser = await User.findOne({ email: normalizedEmail }).lean();
    if (existingUser) {
      return errorResponse("A user with this email already exists", 409);
    }

    const existingStaff = await Staff.findOne({ salonId, email: normalizedEmail }).lean();
    if (existingStaff) {
      return errorResponse("This staff email is already linked to this salon", 409);
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = new User({
      salonId,
      name: body.name.trim(),
      email: normalizedEmail,
      phone: body.phone?.trim() || "",
      password: hashedPassword,
      role: "staff",
      isActive: body.isActive ?? true,
    });
    await user.save();

    const staff = await Staff.create({
      salonId,
      userId: user._id,
      name: body.name.trim(),
      email: normalizedEmail,
      phone: body.phone?.trim() || "",
      specialization: body.specialization.trim(),
      isActive: body.isActive ?? true,
      workingHours: body.workingHours || [],
    });

    return successResponse(staff, "Staff member added", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

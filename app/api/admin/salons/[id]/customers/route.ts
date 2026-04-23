import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Salon from "@/models/Salon";
import { authenticate, isAuthError, requireRole } from "@/middleware/auth";
import { successResponse, errorResponse, validateRequiredFields } from "@/lib/apiHelpers";

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/salons/[id]/customers
 * Super-admin: register a customer directly for any salon.
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
    const missing = validateRequiredFields(body, ["name", "email", "password"]);
    if (missing) return errorResponse(missing, 422);

    const exists = await User.findOne({ email: body.email.toLowerCase().trim(), salonId });
    if (exists) return errorResponse("A customer with this email already exists in this salon", 409);

    const hashed = await bcrypt.hash(body.password, 12);

    const customer = await User.create({
      salonId,
      name:     body.name.trim(),
      email:    body.email.toLowerCase().trim(),
      phone:    body.phone?.trim() || "",
      password: hashed,
      role:     "customer",
      isActive: true,
    });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _p, ...safe } = customer.toObject();
    return successResponse(safe, "Customer registered", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

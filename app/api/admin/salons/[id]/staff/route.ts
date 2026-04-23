import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";
import Salon from "@/models/Salon";
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
    const missing = validateRequiredFields(body, ["name", "specialization"]);
    if (missing) return errorResponse(missing, 422);

    const staff = await Staff.create({
      salonId,
      name:           body.name.trim(),
      phone:          body.phone?.trim() || "",
      specialization: body.specialization.trim(),
      isActive:       true,
      workingHours:   body.workingHours || [],
    });

    return successResponse(staff, "Staff member added", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

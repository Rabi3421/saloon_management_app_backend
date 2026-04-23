import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Service from "@/models/Service";
import Salon from "@/models/Salon";
import { authenticate, isAuthError, requireRole } from "@/middleware/auth";
import { successResponse, errorResponse, validateRequiredFields } from "@/lib/apiHelpers";

type Context = { params: Promise<{ id: string }> };

/**
 * POST /api/admin/salons/[id]/services
 * Super-admin: add a service directly to any salon.
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
    const missing = validateRequiredFields(body, ["name", "price", "duration", "category"]);
    if (missing) return errorResponse(missing, 422);

    const service = await Service.create({
      salonId,
      name:        body.name.trim(),
      price:       Number(body.price),
      duration:    Number(body.duration),
      category:    body.category.trim(),
      description: body.description?.trim() || "",
      isActive:    true,
    });

    return successResponse(service, "Service added", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

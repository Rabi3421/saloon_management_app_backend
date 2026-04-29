import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Promotion from "@/models/Promotion";
import "@/models/Service";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";
import { notifySalonCustomers } from "@/lib/notificationService";
import { isPromotionActive } from "@/lib/promotions";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  if (auth.payload.role !== "owner" && auth.payload.role !== "admin") {
    return errorResponse("Only owners can manage promotions", 403);
  }

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const promotion = await Promotion.findOneAndUpdate(
      { _id: id, salonId: auth.payload.salonId },
      {
        $set: {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.code !== undefined ? { code: String(body.code).toUpperCase() } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.terms !== undefined ? { terms: body.terms } : {}),
          ...(body.type !== undefined ? { type: body.type } : {}),
          ...(body.value !== undefined ? { value: Number(body.value || 0) } : {}),
          ...(body.minBookingAmount !== undefined ? { minBookingAmount: Number(body.minBookingAmount || 0) } : {}),
          ...(body.startsAt !== undefined ? { startsAt: body.startsAt ? new Date(body.startsAt) : null } : {}),
          ...(body.endsAt !== undefined ? { endsAt: body.endsAt ? new Date(body.endsAt) : null } : {}),
          ...(body.appliesToServiceIds !== undefined ? { appliesToServiceIds: Array.isArray(body.appliesToServiceIds) ? body.appliesToServiceIds : [] } : {}),
          ...(body.usageLimit !== undefined ? { usageLimit: body.usageLimit ? Number(body.usageLimit) : null } : {}),
          ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
        },
      },
      { new: true, runValidators: true }
    ).populate("appliesToServiceIds", "name price duration category");

    if (!promotion) return errorResponse("Promotion not found", 404);

    if (auth.payload.salonId && isPromotionActive(promotion)) {
      await notifySalonCustomers({
        salonId: auth.payload.salonId,
        type: "promotion",
        title: promotion.title,
        body: promotion.description || `Offer ${promotion.code} is available now.`,
        meta: {
          promotionId: String(promotion._id),
          promotionCode: promotion.code,
          targetScreen: "Notifications",
        },
      });
    }

    return successResponse(promotion, "Promotion updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  if (auth.payload.role !== "owner" && auth.payload.role !== "admin") {
    return errorResponse("Only owners can manage promotions", 403);
  }

  try {
    await connectDB();
    const { id } = await params;
    const promotion = await Promotion.findOneAndDelete({ _id: id, salonId: auth.payload.salonId });
    if (!promotion) return errorResponse("Promotion not found", 404);
    return successResponse({ _id: id }, "Promotion deleted");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

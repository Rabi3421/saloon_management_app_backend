import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Promotion from "@/models/Promotion";
import "@/models/Service";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse, validateRequiredFields } from "@/lib/apiHelpers";
import { notifySalonCustomers } from "@/lib/notificationService";
import { isPromotionActive } from "@/lib/promotions";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    if (!auth.payload.salonId) {
      return errorResponse("Salon context missing for promotions", 400);
    }

    const promotions = await Promotion.find({ salonId: auth.payload.salonId })
      .populate("appliesToServiceIds", "name price duration category")
      .sort({ createdAt: -1 });

    return successResponse(promotions, "Promotions fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  if (auth.payload.role !== "owner" && auth.payload.role !== "admin") {
    return errorResponse("Only owners can manage promotions", 403);
  }

  try {
    await connectDB();
    const body = await req.json();

    if (!auth.payload.salonId) {
      return errorResponse("Salon context missing for promotions", 400);
    }

    const missingField = validateRequiredFields(body, ["title", "code", "type"]);
    if (missingField) return errorResponse(missingField, 422);

    const promotion = await Promotion.create({
      salonId: auth.payload.salonId,
      title: body.title,
      code: String(body.code).toUpperCase(),
      description: body.description,
      terms: body.terms,
      type: body.type,
      value: Number(body.value || 0),
      minBookingAmount: Number(body.minBookingAmount || 0),
      startsAt: body.startsAt ? new Date(body.startsAt) : undefined,
      endsAt: body.endsAt ? new Date(body.endsAt) : undefined,
      appliesToServiceIds: Array.isArray(body.appliesToServiceIds) ? body.appliesToServiceIds : [],
      usageLimit: body.usageLimit ? Number(body.usageLimit) : undefined,
      isActive: body.isActive ?? true,
    });

    const populated = await Promotion.findById(promotion._id).populate(
      "appliesToServiceIds",
      "name price duration category"
    );

    if (auth.payload.salonId && isPromotionActive(promotion)) {
      await notifySalonCustomers({
        salonId: auth.payload.salonId,
        type: "promotion",
        title: promotion.title,
        body: promotion.description || `New salon offer available with code ${promotion.code}.`,
        meta: {
          promotionId: String(promotion._id),
          promotionCode: promotion.code,
          targetScreen: "Notifications",
        },
      });
    }

    return successResponse(populated ?? promotion, "Promotion created", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Promotion from "@/models/Promotion";
import "@/models/Service";
import { successResponse, errorResponse } from "@/lib/apiHelpers";
import { isPromotionActive } from "@/lib/promotions";

export async function GET(req: NextRequest) {
  try {
    const salonId = req.headers.get("X-Salon-ID");
    if (!salonId) {
      return errorResponse("Salon context missing (X-Salon-ID header required)", 400);
    }

    await connectDB();

    const promotions = await Promotion.find({ salonId, isActive: true })
      .populate("appliesToServiceIds", "name price duration category")
      .sort({ createdAt: -1 });

    const activePromotions = promotions.filter((promotion) => isPromotionActive(promotion));

    return successResponse(activePromotions, "Promotions fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

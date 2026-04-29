import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Salon from "@/models/Salon";
import Review from "@/models/Review";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

/**
 * GET /api/public/salon
 *
 * Returns basic salon info (name, address, phone, plan).
 * No authentication required — used by the customer-facing landing page.
 * Requires X-Salon-ID header (set automatically via NEXT_PUBLIC_SALON_ID).
 */
export async function GET(req: NextRequest) {
  try {
    const salonId = req.headers.get("X-Salon-ID");
    if (!salonId) {
      return errorResponse("Salon context missing (X-Salon-ID header required)", 400);
    }

    await connectDB();

    const [salon, reviewStats] = await Promise.all([
      Salon.findById(salonId).select(
        "name ownerName email phone address about website logo images openingHours plan isActive"
      ),
      Review.aggregate([
        { $match: { salonId: new (await import("mongoose")).default.Types.ObjectId(salonId) } },
        { $group: { _id: null, rating: { $avg: "$rating" }, reviewCount: { $sum: 1 } } },
      ]),
    ]);

    if (!salon || !salon.isActive) {
      return errorResponse("Salon not found or inactive", 404);
    }

    return successResponse(
      {
        ...salon.toObject(),
        rating: reviewStats[0]?.rating ? Math.round(reviewStats[0].rating * 10) / 10 : 0,
        reviewCount: reviewStats[0]?.reviewCount ?? 0,
      },
      "Salon info fetched"
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

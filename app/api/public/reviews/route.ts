import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Review from "@/models/Review";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

/**
 * GET /api/public/reviews
 * Returns all reviews for a salon with average rating.
 * Requires X-Salon-ID header (or ?salonId= query param as fallback).
 *
 * Query params:
 *   ?limit=10   — number of reviews to return (default 20)
 *   ?page=1
 */
export async function GET(req: NextRequest) {
  try {
    const salonId = req.headers.get("X-Salon-ID") || new URL(req.url).searchParams.get("salonId");
    if (!salonId) return errorResponse("salonId is required", 400);

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const page = parseInt(searchParams.get("page") || "1");
    const skip = (page - 1) * limit;

    await connectDB();

    const [reviews, total, stats] = await Promise.all([
      Review.find({ salonId })
        .populate("customerId", "name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments({ salonId }),
      Review.aggregate([
        { $match: { salonId: { $eq: new (require("mongoose").Types.ObjectId)(salonId) } } },
        { $group: { _id: null, avgRating: { $avg: "$rating" }, total: { $sum: 1 } } },
      ]),
    ]);

    const avgRating = stats[0]?.avgRating ? Math.round(stats[0].avgRating * 10) / 10 : 0;

    return successResponse(
      { reviews, total, page, limit, avgRating },
      "Reviews fetched"
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Review from "@/models/Review";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

/**
 * GET /api/user/reviews
 * Returns all reviews written by the logged-in customer.
 */
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const reviews = await Review.find({ customerId: auth.payload.userId })
      .populate("salonId", "name address")
      .populate("bookingId", "bookingDate timeSlot serviceIds")
      .sort({ createdAt: -1 });

    return successResponse(reviews, "Reviews fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

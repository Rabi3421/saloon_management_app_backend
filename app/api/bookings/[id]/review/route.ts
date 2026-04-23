import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Review from "@/models/Review";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse, validateRequiredFields } from "@/lib/apiHelpers";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/bookings/:id/review
 * Body: { rating, comment? }
 *
 * Only the customer who made a COMPLETED booking can leave a review.
 * One review per booking (enforced by unique index on bookingId).
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  if (auth.payload.role !== "customer") {
    return errorResponse("Only customers can leave reviews", 403);
  }

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const missing = validateRequiredFields(body, ["rating"]);
    if (missing) return errorResponse(missing, 422);

    if (body.rating < 1 || body.rating > 5) {
      return errorResponse("Rating must be between 1 and 5", 422);
    }

    const booking = await Booking.findOne({
      _id: id,
      customerId: auth.payload.userId,
      status: "completed",
    });

    if (!booking) {
      return errorResponse("Booking not found or not yet completed", 404);
    }

    // Check if already reviewed
    const existing = await Review.findOne({ bookingId: id });
    if (existing) {
      return errorResponse("You have already reviewed this booking", 409);
    }

    const review = await Review.create({
      salonId: booking.salonId,
      bookingId: booking._id,
      customerId: auth.payload.userId,
      rating: body.rating,
      comment: body.comment || "",
    });

    const populated = await Review.findById(review._id).populate("customerId", "name");

    return successResponse(populated, "Review submitted", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

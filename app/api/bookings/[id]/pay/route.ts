import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Notification from "@/models/Notification";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/bookings/:id/pay
 * Body: { paymentMethodId? }  — optional, records which card was used
 *
 * Marks a booking as paid. In production, call your payment gateway here
 * (Stripe, Razorpay, etc.) before marking as paid.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { id } = await params;

    const filter =
      auth.payload.role === "customer"
        ? { _id: id, customerId: auth.payload.userId }
        : { _id: id, salonId: auth.payload.salonId };

    const booking = await Booking.findOne(filter);
    if (!booking) return errorResponse("Booking not found", 404);

    if (booking.paymentStatus === "paid") {
      return errorResponse("Booking is already paid", 409);
    }

    if (booking.status === "cancelled") {
      return errorResponse("Cannot pay for a cancelled booking", 400);
    }

    booking.paymentStatus = "paid";
    await booking.save();

    // Create a notification for the customer
    await Notification.create({
      userId: booking.customerId,
      salonId: booking.salonId,
      type: "booking",
      title: "Payment Confirmed",
      body: `Your payment of ₹${booking.totalAmount} has been received.`,
      meta: { bookingId: String(booking._id) },
    });

    const populated = await Booking.findById(booking._id)
      .populate("customerId", "name email")
      .populate("serviceIds", "name price")
      .populate("staffId", "name");

    return successResponse(populated, "Payment recorded successfully");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

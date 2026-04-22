import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return errorResponse(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
        422
      );
    }

    // Customers can only cancel their own bookings
    const filter =
      auth.payload.role === "customer"
        ? { _id: id, salonId: auth.payload.salonId, customerId: auth.payload.userId }
        : { _id: id, salonId: auth.payload.salonId };

    if (auth.payload.role === "customer" && body.status !== "cancelled") {
      return errorResponse("Customers can only cancel bookings", 403);
    }

    const booking = await Booking.findOneAndUpdate(
      filter,
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate("customerId", "name email phone")
      .populate("staffId", "name specialization")
      .populate("serviceId", "name price duration");

    if (!booking) return errorResponse("Booking not found", 404);

    return successResponse(booking, "Booking updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

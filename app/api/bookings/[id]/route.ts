import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import "@/models/Salon";
import "@/models/User";
import "@/models/Staff";
import "@/models/Service";
import "@/models/Promotion";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";
import { notifySalonOwners, notifyUsers } from "@/lib/notificationService";

type RouteContext = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"];
const CUSTOMER_ALLOWED_STATUSES = ["cancelled"];

function getStatusNotificationCopy(status: string) {
  switch (status) {
    case "confirmed":
      return {
        customerTitle: "Booking confirmed",
        customerBody: "Your appointment has been confirmed by the salon.",
        ownerTitle: "Booking confirmed",
        ownerBody: "A booking has been confirmed.",
      };
    case "completed":
      return {
        customerTitle: "Booking completed",
        customerBody: "Your appointment has been marked as completed.",
        ownerTitle: "Booking completed",
        ownerBody: "A booking has been marked as completed.",
      };
    case "cancelled":
      return {
        customerTitle: "Booking cancelled",
        customerBody: "Your appointment has been cancelled.",
        ownerTitle: "Booking cancelled",
        ownerBody: "A booking has been cancelled.",
      };
    default:
      return {
        customerTitle: "Booking updated",
        customerBody: `Your booking status is now ${status}.`,
        ownerTitle: "Booking updated",
        ownerBody: `A booking status is now ${status}.`,
      };
  }
}

function canTransitionStatus(currentStatus: string, nextStatus?: string): boolean {
  if (!nextStatus || currentStatus === nextStatus) return true;

  const allowedTransitions: Record<string, string[]> = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };

  return allowedTransitions[currentStatus]?.includes(nextStatus) ?? false;
}

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

    const currentBooking = await Booking.findOne({
      _id: id,
      salonId: auth.payload.salonId,
      ...(auth.payload.role === "customer" ? { customerId: auth.payload.userId } : {}),
    });

    if (!currentBooking) return errorResponse("Booking not found", 404);

    // Customers can only cancel their own bookings
    const filter =
      auth.payload.role === "customer"
        ? { _id: id, salonId: auth.payload.salonId, customerId: auth.payload.userId }
        : { _id: id, salonId: auth.payload.salonId };

    if (
      auth.payload.role === "customer" &&
      body.status &&
      !CUSTOMER_ALLOWED_STATUSES.includes(body.status)
    ) {
      return errorResponse("Customers can only cancel bookings", 403);
    }

    if (auth.payload.role === "customer" && currentBooking.status === "completed") {
      return errorResponse("Completed bookings cannot be cancelled", 409);
    }

    if (!canTransitionStatus(String(currentBooking.status), body.status)) {
      return errorResponse(
        `Cannot change booking from ${currentBooking.status} to ${body.status}`,
        409
      );
    }

    const booking = await Booking.findOneAndUpdate(
      filter,
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate("salonId", "name address")
      .populate("customerId", "name email phone")
      .populate("staffId", "name specialization")
      .populate("serviceId", "name price duration")
      .populate("serviceIds", "name price duration")
      .populate("promotionId", "title code type value description terms");

    if (!booking) return errorResponse("Booking not found", 404);

    if (body.status && body.status !== String(currentBooking.status)) {
      const bookingId = String(booking._id);
      const statusCopy = getStatusNotificationCopy(String(body.status));

      if (auth.payload.role === "customer") {
        await notifySalonOwners({
          salonId: auth.payload.salonId!,
          type: "booking",
          title: statusCopy.ownerTitle,
          body: "A customer cancelled a booking.",
          meta: { bookingId, status: String(body.status), targetScreen: "OwnerBookings" },
        });
      } else {
        await notifyUsers({
          userIds: [String(booking.customerId)],
          salonId: auth.payload.salonId,
          type: "booking",
          title: statusCopy.customerTitle,
          body: statusCopy.customerBody,
          meta: { bookingId, status: String(body.status), targetScreen: "Booking" },
        });
      }
    }

    return successResponse(booking, "Booking updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

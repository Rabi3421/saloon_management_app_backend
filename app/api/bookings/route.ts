import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import "@/models/Salon";
import "@/models/User";
import "@/models/Staff";
import "@/models/Service";
import "@/models/Promotion";
import { authenticate, isAuthError } from "@/middleware/auth";
import {
  successResponse,
  errorResponse,
  validateRequiredFields,
} from "@/lib/apiHelpers";
import Promotion from "@/models/Promotion";
import { calculatePromotionDiscount, isPromotionActive } from "@/lib/promotions";
import { notifySalonOwners, notifyUsers } from "@/lib/notificationService";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { salonId: auth.payload.salonId };

    // Customers only see their own bookings
    if (auth.payload.role === "customer") {
      filter.customerId = auth.payload.userId;
    }

    if (status) filter.status = status;
    if (date) {
      const start = new Date(date);
      const end = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.bookingDate = { $gte: start, $lt: end };
    }

    const bookings = await Booking.find(filter)
      .populate("salonId", "name address")
      .populate("customerId", "name email phone")
      .populate("staffId", "name specialization")
      .populate("serviceId", "name price duration")
      .populate("serviceIds", "name price duration")
      .populate("promotionId", "title code type value description terms")
      .sort({ bookingDate: 1 });

    return successResponse(bookings, "Bookings fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const body = await req.json();

    const missingField = validateRequiredFields(body, [
      "staffId",
      "bookingDate",
      "timeSlot",
    ]);
    if (missingField) return errorResponse(missingField, 422);

    // Accept single serviceId OR array of serviceIds
    const rawServiceIds: string[] = body.serviceIds?.length
      ? body.serviceIds
      : body.serviceId
      ? [body.serviceId]
      : [];

    if (rawServiceIds.length === 0) {
      return errorResponse("serviceId or serviceIds is required", 422);
    }

    // customerId defaults to logged-in user for customers
    const customerId =
      auth.payload.role === "customer"
        ? auth.payload.userId
        : body.customerId;

    if (!customerId) {
      return errorResponse("customerId is required", 422);
    }

    // Calculate total amount from services
    const Service = (await import("@/models/Service")).default;
    const services = await Service.find({ _id: { $in: rawServiceIds } });
    const subtotalAmount = services.reduce((sum, s) => sum + (s.price || 0), 0);

    let discountAmount = 0;
    let promotionId: string | undefined;
    let promotionCode: string | undefined;
    let promotionType: string | undefined;

    if (body.promotionId) {
      const promotion = await Promotion.findOne({
        _id: body.promotionId,
        salonId: auth.payload.salonId,
      });

      if (!promotion || !isPromotionActive(promotion)) {
        return errorResponse("Selected promotion is no longer available", 409);
      }

      const promotionResult = calculatePromotionDiscount(promotion, services, subtotalAmount);
      if (promotionResult.reason === "not-applicable") {
        return errorResponse("Selected promotion is not applicable to this service", 409);
      }
      if (promotionResult.reason === "min-booking-not-met") {
        return errorResponse("Minimum booking amount not met for this promotion", 409);
      }

      discountAmount = promotionResult.discountAmount;
      promotionId = String(promotion._id);
      promotionCode = promotion.code;
      promotionType = promotion.type;

      promotion.usageCount += 1;
      await promotion.save();
    }

    const totalAmount = Math.max(0, subtotalAmount - discountAmount);

    const booking = await Booking.create({
      salonId: auth.payload.salonId!,
      customerId,
      staffId: body.staffId,
      serviceId: rawServiceIds[0],     // first service for backward compat
      serviceIds: rawServiceIds,
      promotionId,
      promotionCode,
      promotionType,
      subtotalAmount,
      discountAmount,
      bookingDate: new Date(body.bookingDate),
      timeSlot: body.timeSlot,
      notes: body.notes,
      totalAmount,
    });

    const populatedBooking = await Booking.findById(booking._id)
      .populate("salonId", "name address")
      .populate("customerId", "name email phone")
      .populate("staffId", "name specialization")
      .populate("serviceId", "name price duration")
      .populate("serviceIds", "name price duration")
      .populate("promotionId", "title code type value description terms");

    const bookingId = String(booking._id);
    const salonName =
      typeof populatedBooking?.salonId === "object" && populatedBooking?.salonId
        ? String((populatedBooking.salonId as { name?: string }).name ?? "your salon")
        : "your salon";

    await Promise.all([
      notifyUsers({
        userIds: [String(customerId)],
        salonId: auth.payload.salonId,
        type: "booking",
        title: "Booking request received",
        body: `Your booking request has been sent to ${salonName}.`,
        meta: { bookingId, targetScreen: "Booking" },
      }),
      notifySalonOwners({
        salonId: auth.payload.salonId!,
        type: "booking",
        title: "New booking request",
        body: "A customer has created a new booking request.",
        meta: { bookingId, targetScreen: "OwnerBookings" },
      }),
    ]);

    return successResponse(populatedBooking ?? booking, "Booking created", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

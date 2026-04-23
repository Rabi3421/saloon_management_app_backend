import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { authenticate, isAuthError } from "@/middleware/auth";
import {
  successResponse,
  errorResponse,
  validateRequiredFields,
} from "@/lib/apiHelpers";

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
      .populate("customerId", "name email phone")
      .populate("staffId", "name specialization")
      .populate("serviceId", "name price duration")
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
    const totalAmount = services.reduce((sum, s) => sum + (s.price || 0), 0);

    const booking = await Booking.create({
      salonId: auth.payload.salonId!,
      customerId,
      staffId: body.staffId,
      serviceId: rawServiceIds[0],     // first service for backward compat
      serviceIds: rawServiceIds,
      bookingDate: new Date(body.bookingDate),
      timeSlot: body.timeSlot,
      notes: body.notes,
      totalAmount,
    });

    return successResponse(booking, "Booking created", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

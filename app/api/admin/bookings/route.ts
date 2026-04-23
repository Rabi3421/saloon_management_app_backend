import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Service from "@/models/Service";
import { authenticate, isAuthError, requireRole } from "@/middleware/auth";
import { successResponse, errorResponse, validateRequiredFields } from "@/lib/apiHelpers";

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

/**
 * GET /api/admin/bookings
 * Super-admin: fetch all bookings across all salons (or filter by salonId, status, date).
 * Query: ?salonId=  &status=  &date=YYYY-MM-DD  &search=  &page=1  &limit=50
 */
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);

    const salonId  = searchParams.get("salonId");
    const status   = searchParams.get("status");
    const date     = searchParams.get("date");
    const search   = searchParams.get("search") || "";
    const page     = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit    = Math.min(100, parseInt(searchParams.get("limit") || "50"));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (salonId) filter.salonId = salonId;
    if (status)  filter.status  = status;
    if (date) {
      const start = new Date(date);
      const end   = new Date(date);
      end.setDate(end.getDate() + 1);
      filter.bookingDate = { $gte: start, $lt: end };
    }

    const [bookings, total] = await Promise.all([
      Booking.find(filter)
        .populate("salonId",    "name")
        .populate("customerId", "name email phone")
        .populate("staffId",    "name specialization")
        .populate("serviceId",  "name price duration")
        .populate("serviceIds", "name price duration")
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Booking.countDocuments(filter),
    ]);

    // Client-side search on populated customer name / salon name
    const filtered = search
      ? bookings.filter((b) => {
          const customer = (b.customerId as { name?: string })?.name || "";
          const salon    = (b.salonId    as { name?: string })?.name || "";
          const s = search.toLowerCase();
          return customer.toLowerCase().includes(s) || salon.toLowerCase().includes(s);
        })
      : bookings;

    return successResponse(
      { bookings: filtered, total, page, limit, pages: Math.ceil(total / limit) },
      "Bookings fetched"
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/admin/bookings
 * Super-admin: create a booking on behalf of a customer for any salon.
 * Body: { salonId, customerId, serviceId | serviceIds[], staffId, bookingDate, timeSlot, notes? }
 */
export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const body = await req.json();

    const missing = validateRequiredFields(body, [
      "salonId", "customerId", "staffId", "bookingDate", "timeSlot",
    ]);
    if (missing) return errorResponse(missing, 422);

    const rawServiceIds: string[] = body.serviceIds?.length
      ? body.serviceIds
      : body.serviceId ? [body.serviceId] : [];
    if (rawServiceIds.length === 0)
      return errorResponse("serviceId or serviceIds is required", 422);

    const services = await Service.find({ _id: { $in: rawServiceIds } });
    const totalAmount = services.reduce((sum, s) => sum + s.price, 0);

    const booking = await Booking.create({
      salonId:     body.salonId,
      customerId:  body.customerId,
      staffId:     body.staffId,
      serviceId:   rawServiceIds[0],
      serviceIds:  rawServiceIds,
      bookingDate: new Date(body.bookingDate),
      timeSlot:    body.timeSlot,
      notes:       body.notes || "",
      status:      body.status || "pending",
      totalAmount,
      paymentStatus: "unpaid",
    });

    const populated = await Booking.findById(booking._id)
      .populate("salonId",    "name")
      .populate("customerId", "name email phone")
      .populate("staffId",    "name specialization")
      .populate("serviceId",  "name price duration")
      .populate("serviceIds", "name price duration");

    return successResponse(populated, "Booking created", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

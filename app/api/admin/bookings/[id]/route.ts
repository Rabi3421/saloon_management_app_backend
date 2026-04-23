import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import { authenticate, isAuthError, requireRole } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

type Context = { params: Promise<{ id: string }> };

const VALID_STATUSES = ["pending", "confirmed", "completed", "cancelled"];

const populate = (q: ReturnType<typeof Booking.findById>) =>
  q
    .populate("salonId",    "name")
    .populate("customerId", "name email phone")
    .populate("staffId",    "name specialization")
    .populate("serviceId",  "name price duration")
    .populate("serviceIds", "name price duration");

/**
 * GET /api/admin/bookings/:id
 */
export async function GET(req: NextRequest, { params }: Context) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const booking = await populate(Booking.findById(id));
    if (!booking) return errorResponse("Booking not found", 404);
    return successResponse(booking, "Booking fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

/**
 * PUT /api/admin/bookings/:id
 * Admin can update status, timeSlot, bookingDate, notes, paymentStatus.
 */
export async function PUT(req: NextRequest, { params }: Context) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    if (body.status && !VALID_STATUSES.includes(body.status)) {
      return errorResponse(`Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`, 422);
    }

    // Only allow safe fields to be updated
    const allowed: Record<string, unknown> = {};
    const safeFields = ["status", "timeSlot", "bookingDate", "notes", "paymentStatus", "staffId"];
    for (const k of safeFields) {
      if (body[k] !== undefined) allowed[k] = body[k];
    }

    const booking = await populate(
      Booking.findByIdAndUpdate(id, { $set: allowed }, { new: true, runValidators: true })
    );
    if (!booking) return errorResponse("Booking not found", 404);

    return successResponse(booking, "Booking updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

/**
 * DELETE /api/admin/bookings/:id
 * Permanently removes a booking.
 */
export async function DELETE(req: NextRequest, { params }: Context) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const booking = await Booking.findByIdAndDelete(id);
    if (!booking) return errorResponse("Booking not found", 404);
    return successResponse(null, "Booking deleted");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

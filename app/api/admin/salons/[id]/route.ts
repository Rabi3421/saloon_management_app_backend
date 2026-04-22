import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Salon from "@/models/Salon";
import User from "@/models/User";
import Booking from "@/models/Booking";
import Service from "@/models/Service";
import Staff from "@/models/Staff";
import { authenticate, isAuthError, requireRole } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

type Context = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Context) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;

    const salon = await Salon.findById(id);
    if (!salon) return errorResponse("Salon not found", 404);

    const [users, bookings, services, staff] = await Promise.all([
      User.find({ salonId: id, role: { $ne: "admin" } }).select("-password").sort({ createdAt: -1 }),
      Booking.find({ salonId: id })
        .populate("customerId", "name email")
        .populate("serviceId", "name price")
        .populate("staffId", "name")
        .sort({ createdAt: -1 })
        .limit(50),
      Service.find({ salonId: id }).sort({ category: 1 }),
      Staff.find({ salonId: id }).sort({ name: 1 }),
    ]);

    return successResponse({ salon, users, bookings, services, staff }, "Salon detail fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function PUT(req: NextRequest, { params }: Context) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const salon = await Salon.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    );
    if (!salon) return errorResponse("Salon not found", 404);

    return successResponse(salon, "Salon updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;

    const salon = await Salon.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );
    if (!salon) return errorResponse("Salon not found", 404);

    return successResponse(salon, "Salon deactivated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

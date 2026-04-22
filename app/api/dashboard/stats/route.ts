import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Service from "@/models/Service";
import Staff from "@/models/Staff";
import User from "@/models/User";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { salonId, role } = auth.payload;

    if (!salonId || role === "admin") {
      return errorResponse("Admin accounts cannot access the owner dashboard. Please go to /admin.", 403);
    }

    const [
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      totalServices,
      totalStaff,
      totalCustomers,
      recentBookings,
    ] = await Promise.all([
      Booking.countDocuments({ salonId }),
      Booking.countDocuments({ salonId, status: "pending" }),
      Booking.countDocuments({ salonId, status: "confirmed" }),
      Booking.countDocuments({ salonId, status: "completed" }),
      Service.countDocuments({ salonId, isActive: true }),
      Staff.countDocuments({ salonId, isActive: true }),
      User.countDocuments({ salonId, role: "customer", isActive: true }),
      Booking.find({ salonId })
        .populate("customerId", "name email")
        .populate("serviceId", "name price")
        .populate("staffId", "name")
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    return successResponse(
      {
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
        },
        totalServices,
        totalStaff,
        totalCustomers,
        recentBookings,
      },
      "Stats fetched"
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

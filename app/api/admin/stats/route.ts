import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Salon from "@/models/Salon";
import User from "@/models/User";
import Booking from "@/models/Booking";
import Service from "@/models/Service";
import Staff from "@/models/Staff";
import { authenticate, isAuthError, requireRole } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();

    const [
      totalSalons,
      activeSalons,
      totalUsers,
      totalOwners,
      totalCustomers,
      totalStaff,
      totalServices,
      totalBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      recentSalons,
      recentBookings,
    ] = await Promise.all([
      Salon.countDocuments(),
      Salon.countDocuments({ isActive: true }),
      User.countDocuments({ role: { $ne: "admin" } }),
      User.countDocuments({ role: "owner" }),
      User.countDocuments({ role: "customer" }),
      Staff.countDocuments({ isActive: true }),
      Service.countDocuments({ isActive: true }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: "pending" }),
      Booking.countDocuments({ status: "confirmed" }),
      Booking.countDocuments({ status: "completed" }),
      Booking.countDocuments({ status: "cancelled" }),
      Salon.find().sort({ createdAt: -1 }).limit(5),
      Booking.find()
        .populate("salonId", "name")
        .populate("customerId", "name email")
        .populate("serviceId", "name price")
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    return successResponse(
      {
        salons: { total: totalSalons, active: activeSalons },
        users: {
          total: totalUsers,
          owners: totalOwners,
          customers: totalCustomers,
        },
        staff: totalStaff,
        services: totalServices,
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
        },
        recentSalons,
        recentBookings,
      },
      "Global stats fetched"
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import Service from "@/models/Service";
import Staff from "@/models/Staff";
import User from "@/models/User";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";
import { getStaffMemberForUser } from "@/lib/staffAuth";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { salonId, role } = auth.payload;

    if (!salonId || role === "admin") {
      return errorResponse("Admin accounts cannot access the owner dashboard. Please go to /admin.", 403);
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const staffMember =
      role === "staff"
        ? await getStaffMemberForUser({ salonId, userId: auth.payload.userId })
        : null;

    if (role === "staff" && !staffMember) {
      return errorResponse("Staff account is not linked to a staff profile", 404);
    }

    const bookingFilter = {
      salonId,
      ...(role === "staff" && staffMember ? { staffId: staffMember._id } : {}),
    };

    const [
      totalBookings,
      todayBookings,
      pendingBookings,
      confirmedBookings,
      completedBookings,
      cancelledBookings,
      paidBookings,
      todayPaidBookings,
      totalServices,
      totalStaff,
      totalCustomers,
      recentBookings,
    ] = await Promise.all([
      Booking.countDocuments(bookingFilter),
      Booking.countDocuments({
        ...bookingFilter,
        bookingDate: { $gte: todayStart, $lt: tomorrowStart },
      }),
      Booking.countDocuments({ ...bookingFilter, status: "pending" }),
      Booking.countDocuments({ ...bookingFilter, status: "confirmed" }),
      Booking.countDocuments({ ...bookingFilter, status: "completed" }),
      Booking.countDocuments({ ...bookingFilter, status: "cancelled" }),
      Booking.find({ ...bookingFilter, paymentStatus: "paid" }).select("totalAmount"),
      Booking.find({
        ...bookingFilter,
        paymentStatus: "paid",
        bookingDate: { $gte: todayStart, $lt: tomorrowStart },
      }).select("totalAmount"),
      Service.countDocuments({ salonId, isActive: true }),
      Staff.countDocuments({ salonId, isActive: true }),
      User.countDocuments({ salonId, role: "customer", isActive: true }),
      Booking.find(bookingFilter)
        .populate("customerId", "name email")
        .populate("serviceId", "name price")
        .populate("staffId", "name")
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const totalRevenue = paidBookings.reduce(
      (sum, booking) => sum + Number(booking.totalAmount ?? 0),
      0
    );
    const todayRevenue = todayPaidBookings.reduce(
      (sum, booking) => sum + Number(booking.totalAmount ?? 0),
      0
    );

    return successResponse(
      {
        totalBookings,
        todayBookings,
        pendingBookings,
        confirmedBookings,
        completedBookings,
        cancelledBookings,
        totalRevenue,
        todayRevenue,
        bookings: {
          total: totalBookings,
          pending: pendingBookings,
          confirmed: confirmedBookings,
          completed: completedBookings,
          cancelled: cancelledBookings,
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

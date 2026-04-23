import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Booking from "@/models/Booking";
import User from "@/models/User";
import Staff from "@/models/Staff";
import Salon from "@/models/Salon";
import { authenticate, isAuthError, requireRole } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

/**
 * GET /api/admin/analytics
 * Super-admin: full analytics across all salons.
 *
 * Query params:
 *   period   = "day" | "week" | "month" | "year" | "custom"  (default: "month")
 *   from     = YYYY-MM-DD  (required when period="custom")
 *   to       = YYYY-MM-DD  (required when period="custom")
 *   salonId  = filter to one salon (optional)
 */
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const period  = searchParams.get("period") || "month";
    const salonId = searchParams.get("salonId") || null;

    // ── Resolve date range ──────────────────────────────────────────────────
    const now   = new Date();
    let dateFrom: Date;
    let dateTo:   Date = new Date(now);
    dateTo.setHours(23, 59, 59, 999);

    if (period === "custom") {
      const f = searchParams.get("from");
      const t = searchParams.get("to");
      if (!f || !t) return errorResponse("from and to are required for custom period", 422);
      dateFrom = new Date(f);
      dateTo   = new Date(t);
      dateTo.setHours(23, 59, 59, 999);
    } else if (period === "day") {
      dateFrom = new Date(now);
      dateFrom.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      dateFrom = new Date(now);
      dateFrom.setDate(now.getDate() - 6);
      dateFrom.setHours(0, 0, 0, 0);
    } else if (period === "year") {
      dateFrom = new Date(now.getFullYear(), 0, 1);
    } else {
      // month (default)
      dateFrom = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // ── Determine time-series grouping format ───────────────────────────────
    // day/week → group by day; month → group by day; year → group by month
    const groupByMonth = period === "year";
    const dateFormat   = groupByMonth ? "%Y-%m" : "%Y-%m-%d";

    // ── Base booking filter ─────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bookingMatch: Record<string, any> = {
      bookingDate: { $gte: dateFrom, $lte: dateTo },
    };
    if (salonId) bookingMatch.salonId = new (await import("mongoose")).default.Types.ObjectId(salonId);

    // ── Previous period (for % change) ─────────────────────────────────────
    const rangeMs     = dateTo.getTime() - dateFrom.getTime();
    const prevDateTo  = new Date(dateFrom.getTime() - 1);
    const prevDateFrom = new Date(prevDateTo.getTime() - rangeMs);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const prevMatch: Record<string, any> = {
      bookingDate: { $gte: prevDateFrom, $lte: prevDateTo },
    };
    if (salonId) prevMatch.salonId = bookingMatch.salonId;

    // ── Run all aggregations in parallel ───────────────────────────────────
    const [
      // Current period bookings
      bookingsInRange,
      // Previous period bookings (for change %)
      prevBookings,
      // Time-series: bookings count + revenue per day/month
      timeSeries,
      // Booking status breakdown
      statusBreakdown,
      // Payment status
      paymentBreakdown,
      // Top salons by booking count
      topSalons,
      // Top staff by booking count
      topStaff,
      // Popular time slots
      popularSlots,
      // New users in range
      newUsers,
      // New users prev period
      prevNewUsers,
      // Total salons
      totalSalons,
      // Total staff
      totalStaff,
      // Salon detail when filtering by salonId
      salonDetail,
    ] = await Promise.all([
      // 1. All bookings in range
      Booking.find(bookingMatch).select("totalAmount paymentStatus status"),

      // 2. Prev period count
      Booking.countDocuments(prevMatch),

      // 3. Time series
      Booking.aggregate([
        { $match: bookingMatch },
        { $group: {
          _id: { $dateToString: { format: dateFormat, date: "$bookingDate" } },
          count:   { $sum: 1 },
          revenue: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0] } },
        }},
        { $sort: { _id: 1 } },
      ]),

      // 4. Status breakdown
      Booking.aggregate([
        { $match: bookingMatch },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // 5. Payment breakdown
      Booking.aggregate([
        { $match: bookingMatch },
        { $group: { _id: "$paymentStatus", count: { $sum: 1 }, revenue: { $sum: "$totalAmount" } } },
      ]),

      // 6. Top salons
      Booking.aggregate([
        { $match: bookingMatch },
        { $group: {
          _id:     "$salonId",
          bookings: { $sum: 1 },
          revenue:  { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0] } },
        }},
        { $sort: { bookings: -1 } },
        { $limit: 8 },
        { $lookup: { from: "salons", localField: "_id", foreignField: "_id", as: "salon" } },
        { $unwind: { path: "$salon", preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ["$salon.name", "Unknown"] }, bookings: 1, revenue: 1 } },
      ]),

      // 7. Top staff
      Booking.aggregate([
        { $match: bookingMatch },
        { $group: { _id: "$staffId", bookings: { $sum: 1 } } },
        { $sort: { bookings: -1 } },
        { $limit: 8 },
        { $lookup: { from: "staffs", localField: "_id", foreignField: "_id", as: "staff" } },
        { $unwind: { path: "$staff", preserveNullAndEmptyArrays: true } },
        { $project: { name: { $ifNull: ["$staff.name", "Unknown"] }, specialization: { $ifNull: ["$staff.specialization", "—"] }, bookings: 1 } },
      ]),

      // 8. Popular time slots
      Booking.aggregate([
        { $match: bookingMatch },
        { $group: { _id: "$timeSlot", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // 9. New users in range
      User.countDocuments({
        createdAt: { $gte: dateFrom, $lte: dateTo },
        role: { $ne: "admin" },
        ...(salonId ? { salonId } : {}),
      }),

      // 10. Prev new users
      User.countDocuments({
        createdAt: { $gte: prevDateFrom, $lte: prevDateTo },
        role: { $ne: "admin" },
        ...(salonId ? { salonId } : {}),
      }),

      // 11. Total active salons (or 1 if filtering by a specific salon)
      salonId
        ? Promise.resolve(1)
        : Salon.countDocuments({ isActive: true }),

      // 12. Total active staff (filtered by salon if provided)
      Staff.countDocuments({ isActive: true, ...(salonId ? { salonId } : {}) }),

      // 13. Salon name (when filtering by salonId)
      salonId
        ? Salon.findById(salonId).select("name city").lean()
        : Promise.resolve(null),
    ]);

    // ── Compute summary metrics ─────────────────────────────────────────────
    const totalBookings = bookingsInRange.length;
    const totalRevenue  = bookingsInRange
      .filter((b) => b.paymentStatus === "paid")
      .reduce((s, b) => s + (b.totalAmount || 0), 0);
    const paidCount     = bookingsInRange.filter((b) => b.paymentStatus === "paid").length;
    const unpaidRevenue = bookingsInRange
      .filter((b) => b.paymentStatus === "unpaid")
      .reduce((s, b) => s + (b.totalAmount || 0), 0);

    const bookingChange = prevBookings === 0
      ? totalBookings > 0 ? 100 : 0
      : Math.round(((totalBookings - prevBookings) / prevBookings) * 100);

    const userChange = prevNewUsers === 0
      ? newUsers > 0 ? 100 : 0
      : Math.round(((newUsers - prevNewUsers) / prevNewUsers) * 100);

    // Normalise status breakdown into a map
    const statusMap: Record<string, number> = {};
    statusBreakdown.forEach((s) => { statusMap[s._id] = s.count; });

    // Payment breakdown
    const paymentMap: Record<string, { count: number; revenue: number }> = {};
    paymentBreakdown.forEach((p) => { paymentMap[p._id] = { count: p.count, revenue: p.revenue }; });

    return successResponse({
      meta: { period, dateFrom, dateTo, salonId, salonName: (salonDetail as { name?: string } | null)?.name ?? null },
      summary: {
        totalBookings,
        bookingChange,
        totalRevenue,
        paidCount,
        unpaidRevenue,
        newUsers,
        userChange,
        totalSalons,
        totalStaff,
      },
      statusBreakdown: {
        pending:   statusMap["pending"]   || 0,
        confirmed: statusMap["confirmed"] || 0,
        completed: statusMap["completed"] || 0,
        cancelled: statusMap["cancelled"] || 0,
      },
      paymentBreakdown: {
        paid:   paymentMap["paid"]   || { count: 0, revenue: 0 },
        unpaid: paymentMap["unpaid"] || { count: 0, revenue: 0 },
      },
      timeSeries,
      topSalons,
      topStaff,
      popularSlots: popularSlots.map((s) => ({ slot: s._id, count: s.count })),
    }, "Analytics fetched");

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

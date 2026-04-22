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

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const plan = searchParams.get("plan") || "";
    const isActive = searchParams.get("isActive");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { ownerName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }
    if (plan) filter.plan = plan;
    if (isActive !== null && isActive !== "")
      filter.isActive = isActive === "true";

    const salons = await Salon.find(filter).sort({ createdAt: -1 });

    // Attach counts
    const enriched = await Promise.all(
      salons.map(async (s) => {
        const salonId = s._id;
        const [userCount, bookingCount, serviceCount, staffCount] =
          await Promise.all([
            User.countDocuments({ salonId, role: { $ne: "admin" } }),
            Booking.countDocuments({ salonId }),
            Service.countDocuments({ salonId, isActive: true }),
            Staff.countDocuments({ salonId, isActive: true }),
          ]);
        return {
          ...s.toJSON(),
          _counts: { users: userCount, bookings: bookingCount, services: serviceCount, staff: staffCount },
        };
      })
    );

    return successResponse(enriched, "Salons fetched");
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

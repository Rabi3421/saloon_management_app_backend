import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

/**
 * GET /api/public/staff
 *
 * Returns all active staff for a salon.
 * No authentication required — used by the customer-facing booking page.
 * Requires X-Salon-ID header (set automatically via NEXT_PUBLIC_SALON_ID).
 */
export async function GET(req: NextRequest) {
  try {
    const salonId = req.headers.get("X-Salon-ID");
    if (!salonId) {
      return errorResponse("Salon context missing (X-Salon-ID header required)", 400);
    }

    await connectDB();

    const staff = await Staff.find({ salonId, isActive: true })
      .select("name specialization workingHours")
      .sort({ name: 1 });

    return successResponse(staff, "Staff fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

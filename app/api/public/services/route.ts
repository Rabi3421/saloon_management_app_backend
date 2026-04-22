import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Service from "@/models/Service";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

/**
 * GET /api/public/services
 *
 * Returns all active services for a salon.
 * No authentication required — used by the customer-facing booking page.
 * Requires X-Salon-ID header (set automatically via NEXT_PUBLIC_SALON_ID).
 *
 * Query params:
 *   ?category=Hair   — filter by category
 */
export async function GET(req: NextRequest) {
  try {
    const salonId = req.headers.get("X-Salon-ID");
    if (!salonId) {
      return errorResponse("Salon context missing (X-Salon-ID header required)", 400);
    }

    await connectDB();

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { salonId, isActive: true };
    if (category) filter.category = category;

    const services = await Service.find(filter).sort({ category: 1, name: 1 });

    return successResponse(services, "Services fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

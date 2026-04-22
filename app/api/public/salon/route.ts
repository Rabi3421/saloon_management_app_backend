import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Salon from "@/models/Salon";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

/**
 * GET /api/public/salon
 *
 * Returns basic salon info (name, address, phone, plan).
 * No authentication required — used by the customer-facing landing page.
 * Requires X-Salon-ID header (set automatically via NEXT_PUBLIC_SALON_ID).
 */
export async function GET(req: NextRequest) {
  try {
    const salonId = req.headers.get("X-Salon-ID");
    if (!salonId) {
      return errorResponse("Salon context missing (X-Salon-ID header required)", 400);
    }

    await connectDB();

    const salon = await Salon.findById(salonId).select(
      "name ownerName email phone address plan isActive"
    );

    if (!salon || !salon.isActive) {
      return errorResponse("Salon not found or inactive", 404);
    }

    return successResponse(salon, "Salon info fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

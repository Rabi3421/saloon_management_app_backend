import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Salon from "@/models/Salon";
import Service from "@/models/Service";
import Staff from "@/models/Staff";
import Review from "@/models/Review";
import { errorResponse, successResponse } from "@/lib/apiHelpers";
import { buildPublicAppContent } from "@/lib/appContent";

export async function GET(req: NextRequest) {
  try {
    const salonId = req.headers.get("X-Salon-ID");
    if (!salonId) {
      return errorResponse("Salon context missing (X-Salon-ID header required)", 400);
    }

    await connectDB();

    const [salon, serviceCount, staffCount, reviewCount] = await Promise.all([
      Salon.findById(salonId).select(
        "name phone email website address about tagline logo isActive"
      ),
      Service.countDocuments({ salonId, isActive: true }),
      Staff.countDocuments({ salonId, isActive: true }),
      Review.countDocuments({ salonId }),
    ]);

    if (!salon || !salon.isActive) {
      return errorResponse("Salon not found or inactive", 404);
    }

    const content = buildPublicAppContent({
      salon: {
        _id: String(salon._id),
        name: salon.name,
        phone: salon.phone,
        email: salon.email,
        website: salon.website,
        address: salon.address,
        about: salon.about,
        tagline: salon.tagline,
        logo: salon.logo,
      },
      reviewCount,
      serviceCount,
      staffCount,
    });

    return successResponse(content, "App content fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
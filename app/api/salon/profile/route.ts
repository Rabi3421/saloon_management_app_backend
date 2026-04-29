import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Salon from "@/models/Salon";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";
import { geocodeSalonAddress } from "@/lib/geocoding";

function normalizeStringArray(input: unknown): string[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function normalizeFeatureBanners(input: unknown) {
  if (!Array.isArray(input)) return [];

  return input
    .map((item) => ({
      title: String((item as Record<string, unknown>)?.title ?? "").trim(),
      subtitle: String((item as Record<string, unknown>)?.subtitle ?? "").trim(),
      image: String((item as Record<string, unknown>)?.image ?? "").trim(),
      ctaLabel: String((item as Record<string, unknown>)?.ctaLabel ?? "Explore").trim(),
    }))
    .filter((item) => item.title && item.image);
}

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const salon = await Salon.findById(auth.payload.salonId);
    if (!salon) return errorResponse("Salon not found", 404);

    if (!salon.location && salon.address) {
      const geocodedLocation = await geocodeSalonAddress(salon.address).catch(() => null);
      if (geocodedLocation) {
        salon.location = geocodedLocation;
        await salon.save();
      }
    }

    return successResponse(salon, "Salon profile fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function PUT(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  if (auth.payload.role !== "owner" && auth.payload.role !== "admin") {
    return errorResponse("Only owners can update salon profile", 403);
  }

  try {
    await connectDB();
    const body = await req.json();

    const existingSalon = await Salon.findById(auth.payload.salonId);
    if (!existingSalon) return errorResponse("Salon not found", 404);

    // Prevent updating email via this route
    delete body.email;

    const updatePayload = {
      ...(body.name !== undefined ? { name: String(body.name).trim() } : {}),
      ...(body.ownerName !== undefined ? { ownerName: String(body.ownerName).trim() } : {}),
      ...(body.phone !== undefined ? { phone: String(body.phone).trim() } : {}),
      ...(body.address !== undefined ? { address: String(body.address).trim() } : {}),
      ...(body.about !== undefined ? { about: String(body.about).trim() } : {}),
      ...(body.website !== undefined ? { website: String(body.website).trim() } : {}),
      ...(body.logo !== undefined ? { logo: String(body.logo).trim() } : {}),
      ...(body.coverImage !== undefined ? { coverImage: String(body.coverImage).trim() } : {}),
      ...(body.tagline !== undefined ? { tagline: String(body.tagline).trim() } : {}),
      ...(body.images !== undefined ? { images: normalizeStringArray(body.images) } : {}),
      ...(body.featureBanners !== undefined
        ? { featureBanners: normalizeFeatureBanners(body.featureBanners) }
        : {}),
      ...(body.plan !== undefined ? { plan: body.plan } : {}),
      ...(body.openingHours !== undefined ? { openingHours: body.openingHours } : {}),
      ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
    };

    const effectiveAddress =
      updatePayload.address !== undefined ? updatePayload.address : existingSalon.address;

    const shouldRefreshLocation =
      updatePayload.address !== undefined || !existingSalon.location;

    let shouldUnsetLocation = false;

    if (effectiveAddress && shouldRefreshLocation) {
      const geocodedLocation = await geocodeSalonAddress(effectiveAddress).catch(() => null);
      if (geocodedLocation) {
        Object.assign(updatePayload, { location: geocodedLocation });
      } else if (updatePayload.address !== undefined) {
        shouldUnsetLocation = true;
      }
    }

    const updateOperation: {
      $set: typeof updatePayload;
      $unset?: Record<string, 1>;
    } = { $set: updatePayload };

    if (shouldUnsetLocation) {
      updateOperation.$unset = { location: 1 };
    }

    const salon = await Salon.findByIdAndUpdate(
      auth.payload.salonId,
      updateOperation,
      { new: true, runValidators: true }
    );

    return successResponse(salon, "Salon profile updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

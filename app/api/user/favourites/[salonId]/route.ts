import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Favourite from "@/models/Favourite";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

type RouteContext = { params: Promise<{ salonId: string }> };

/**
 * POST /api/user/favourites/:salonId
 * Add a salon to favourites.
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { salonId } = await params;

    // upsert — safe to call multiple times
    const fav = await Favourite.findOneAndUpdate(
      { userId: auth.payload.userId, salonId },
      { userId: auth.payload.userId, salonId },
      { upsert: true, new: true }
    );

    return successResponse(fav, "Added to favourites");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

/**
 * DELETE /api/user/favourites/:salonId
 * Remove a salon from favourites.
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { salonId } = await params;

    await Favourite.findOneAndDelete({ userId: auth.payload.userId, salonId });

    return successResponse(null, "Removed from favourites");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

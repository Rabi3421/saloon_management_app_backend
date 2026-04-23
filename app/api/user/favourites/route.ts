import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Favourite from "@/models/Favourite";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

/**
 * GET /api/user/favourites
 * Returns all salons favourited by the logged-in customer.
 */
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const favs = await Favourite.find({ userId: auth.payload.userId })
      .populate("salonId", "name address phone plan")
      .sort({ createdAt: -1 });

    return successResponse(favs, "Favourites fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

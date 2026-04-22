import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Salon from "@/models/Salon";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const salon = await Salon.findById(auth.payload.salonId);
    if (!salon) return errorResponse("Salon not found", 404);

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

    // Prevent updating email via this route
    delete body.email;

    const salon = await Salon.findByIdAndUpdate(
      auth.payload.salonId,
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!salon) return errorResponse("Salon not found", 404);

    return successResponse(salon, "Salon profile updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

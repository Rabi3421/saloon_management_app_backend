import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Service from "@/models/Service";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  if (auth.payload.role !== "owner" && auth.payload.role !== "admin") {
    return errorResponse("Only owners can update services", 403);
  }

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const service = await Service.findOneAndUpdate(
      { _id: id, salonId: auth.payload.salonId },
      { $set: body },
      { new: true, runValidators: true }
    );

    if (!service) return errorResponse("Service not found", 404);

    return successResponse(service, "Service updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  if (auth.payload.role !== "owner" && auth.payload.role !== "admin") {
    return errorResponse("Only owners can delete services", 403);
  }

  try {
    await connectDB();
    const { id } = await params;

    // Soft delete
    const service = await Service.findOneAndUpdate(
      { _id: id, salonId: auth.payload.salonId },
      { isActive: false },
      { new: true }
    );

    if (!service) return errorResponse("Service not found", 404);

    return successResponse(null, "Service deleted");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

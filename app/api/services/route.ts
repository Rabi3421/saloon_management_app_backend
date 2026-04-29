import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Service from "@/models/Service";
import { authenticate, isAuthError } from "@/middleware/auth";
import {
  successResponse,
  errorResponse,
  validateRequiredFields,
} from "@/lib/apiHelpers";

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const services = await Service.find({
      salonId: auth.payload.salonId,
      isActive: true,
    }).sort({ category: 1, name: 1 });

    return successResponse(services, "Services fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  if (!["owner", "staff", "admin"].includes(auth.payload.role)) {
    return errorResponse("Only owners or staff can add services", 403);
  }

  try {
    await connectDB();
    const body = await req.json();

    const missingField = validateRequiredFields(body, [
      "name",
      "price",
      "duration",
      "category",
    ]);
    if (missingField) return errorResponse(missingField, 422);

    const service = await Service.create({
      ...body,
      salonId: auth.payload.salonId,
    });

    return successResponse(service, "Service created", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

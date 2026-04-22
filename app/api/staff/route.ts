import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";
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
    const staff = await Staff.find({
      salonId: auth.payload.salonId,
      isActive: true,
    }).sort({ name: 1 });

    return successResponse(staff, "Staff fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  if (auth.payload.role !== "owner" && auth.payload.role !== "admin") {
    return errorResponse("Only owners can add staff", 403);
  }

  try {
    await connectDB();
    const body = await req.json();

    const missingField = validateRequiredFields(body, ["name", "specialization"]);
    if (missingField) return errorResponse(missingField, 422);

    const member = await Staff.create({
      ...body,
      salonId: auth.payload.salonId,
    });

    return successResponse(member, "Staff member added", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

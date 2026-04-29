import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import { authenticate, isAuthError } from "@/middleware/auth";
import {
  errorResponse,
  successResponse,
  validateRequiredFields,
} from "@/lib/apiHelpers";

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const body = await req.json();
    const missingField = validateRequiredFields(body, ["token", "platform"]);
    if (missingField) return errorResponse(missingField, 422);

    const platform = String(body.platform);
    if (!["ios", "android"].includes(platform)) {
      return errorResponse("platform must be ios or android", 422);
    }

    await User.findByIdAndUpdate(auth.payload.userId, {
      $pull: { deviceTokens: { token: body.token } },
    });

    await User.findByIdAndUpdate(auth.payload.userId, {
      $push: {
        deviceTokens: {
          token: String(body.token),
          platform,
          lastSeenAt: new Date(),
        },
      },
    });

    return successResponse(null, "Push token saved");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");

    if (!token) return errorResponse("token is required", 422);

    await User.findByIdAndUpdate(auth.payload.userId, {
      $pull: { deviceTokens: { token } },
    });

    return successResponse(null, "Push token removed");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
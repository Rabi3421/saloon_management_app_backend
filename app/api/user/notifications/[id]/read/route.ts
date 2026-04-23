import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/user/notifications/:id/read
 * Marks a single notification as read.
 * Pass id = "all" to mark all as read.
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { id } = await params;

    if (id === "all") {
      await Notification.updateMany(
        { userId: auth.payload.userId, isRead: false },
        { isRead: true }
      );
      return successResponse(null, "All notifications marked as read");
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, userId: auth.payload.userId },
      { isRead: true },
      { new: true }
    );

    if (!notification) return errorResponse("Notification not found", 404);

    return successResponse(notification, "Marked as read");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

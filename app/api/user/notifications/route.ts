import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Notification from "@/models/Notification";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

/**
 * GET /api/user/notifications
 * Returns notifications for the logged-in user, newest first.
 * Query: ?unreadOnly=true
 */
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const filter: Record<string, unknown> = { userId: auth.payload.userId };
    if (unreadOnly) filter.isRead = false;

    const [notifications, unreadCount] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).limit(50),
      Notification.countDocuments({ userId: auth.payload.userId, isRead: false }),
    ]);

    return successResponse({ notifications, unreadCount }, "Notifications fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

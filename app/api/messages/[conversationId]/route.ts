import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Conversation, Message } from "@/models/Message";
import "@/models/User"; // ensure User schema is registered for populate
import "@/models/Salon"; // ensure Salon schema is registered for populate
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

type RouteContext = { params: Promise<{ conversationId: string }> };

/**
 * GET /api/messages/:conversationId
 * Returns paginated messages in a conversation thread.
 * Auto-marks the caller's unread count as 0.
 *
 * Query params:
 *   page  (default 1)
 *   limit (default 50)
 *
 * Response:
 *   { conversation, messages, pagination: { page, limit, total, hasMore } }
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { conversationId } = await params;

    const { searchParams } = new URL(req.url);
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip  = (page - 1) * limit;

    // Verify the requester belongs to this conversation
    const convFilter =
      auth.payload.role === "customer"
        ? { _id: conversationId, customerId: auth.payload.userId }
        : { _id: conversationId, salonId: auth.payload.salonId };

    const conversation = await Conversation.findOne(convFilter)
      .populate("customerId", "name email phone")
      .populate("salonId", "name");

    if (!conversation) return errorResponse("Conversation not found", 404);

    const [messages, total] = await Promise.all([
      Message.find({ conversationId })
        .populate("senderId", "name")
        .sort({ createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversationId }),
    ]);

    // Mark unread as 0 for the reader
    if (auth.payload.role === "customer") {
      conversation.unreadByCustomer = 0;
    } else {
      conversation.unreadBySalon = 0;
    }
    await conversation.save();

    return successResponse(
      {
        conversation,
        messages,
        pagination: { page, limit, total, hasMore: skip + messages.length < total },
      },
      "Messages fetched"
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

/**
 * PATCH /api/messages/:conversationId/read
 * Marks all messages as read for the calling side without fetching the thread.
 * Useful for "open chat" events without re-fetching messages.
 */
export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { conversationId } = await params;

    const convFilter =
      auth.payload.role === "customer"
        ? { _id: conversationId, customerId: auth.payload.userId }
        : { _id: conversationId, salonId: auth.payload.salonId };

    const conversation = await Conversation.findOne(convFilter);
    if (!conversation) return errorResponse("Conversation not found", 404);

    if (auth.payload.role === "customer") {
      conversation.unreadByCustomer = 0;
    } else {
      conversation.unreadBySalon = 0;
    }
    await conversation.save();

    return successResponse({ conversationId }, "Marked as read");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

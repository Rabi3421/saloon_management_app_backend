import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Conversation, Message } from "@/models/Message";
import "@/models/User";  // register User schema for populate
import "@/models/Salon"; // register Salon schema for populate
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

type RouteContext = { params: Promise<{ conversationId: string }> };

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messages/:conversationId
//
// Load the full message thread — paginated, sorted oldest → newest (WhatsApp order).
// Call this when opening the chat screen to load past messages.
// Also resets the caller's unread count to 0.
//
// Query params:
//   page  — default 1
//   limit — default 50, max 100
//
// Response:
//   { conversation, messages: [...], pagination: { page, limit, total, hasMore } }
//
// Note: Real-time new messages are delivered via Socket.io "new_message" event.
//       Attach to room "conv:<conversationId>" after calling this endpoint.
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { conversationId } = await params;
    const { searchParams } = new URL(req.url);

    // Verify the caller belongs to this conversation
    const convFilter =
      auth.payload.role === "customer"
        ? { _id: conversationId, customerId: auth.payload.userId }
        : { _id: conversationId, salonId: auth.payload.salonId };

    const conversation = await Conversation.findOne(convFilter)
      .populate("customerId", "name email phone")
      .populate("salonId", "name");

    if (!conversation) return errorResponse("Conversation not found", 404);

    // Paginated history
    const page  = Math.max(1, parseInt(searchParams.get("page")  ?? "1",  10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10)));
    const skip  = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      Message.find({ conversationId })
        .populate("senderId", "name")
        .sort({ createdAt: 1 })   // oldest first — same order as WhatsApp/iMessage
        .skip(skip)
        .limit(limit)
        .lean(),
      Message.countDocuments({ conversationId }),
    ]);

    // Reset caller's unread badge when loading history
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
      "Thread loaded"
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(msg, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/messages/:conversationId
//
// Mark the conversation as read for the calling side (reset unread count to 0).
// Call this when the user opens the chat screen — lightweight, no messages fetched.
//
// Response: { conversationId, unreadCount: 0 }
// ─────────────────────────────────────────────────────────────────────────────
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

    return successResponse({ conversationId, unreadCount: 0 }, "Marked as read");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(msg, 500);
  }
}

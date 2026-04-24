import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Conversation, Message } from "@/models/Message";
import "@/models/User";  // register User schema for populate
import "@/models/Salon"; // register Salon schema for populate
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse, validateRequiredFields } from "@/lib/apiHelpers";

type RouteContext = { params: Promise<{ conversationId: string }> };

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messages/:conversationId
//
// Load the full message thread. Two modes:
//
// 1. HISTORY  (default) — paginated, oldest first
//    GET /api/messages/:conversationId?page=1&limit=50
//    Use this when opening the chat screen to load past messages.
//    Also marks the caller's unread count as 0.
//
// 2. POLL     — only new messages since a timestamp (for real-time polling)
//    GET /api/messages/:conversationId?after=<ISO-timestamp>
//    Use this to periodically check for new messages without reloading history.
//    Call every 3–5 seconds while the chat is open.
//    Does NOT mark messages as read (use PATCH for that).
//
// Response (history mode):
//   { conversation, messages: [...], pagination: { page, limit, total, hasMore } }
//
// Response (poll mode):
//   { messages: [...], hasNew: boolean }
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { conversationId } = await params;
    const { searchParams } = new URL(req.url);
    const after = searchParams.get("after"); // ISO timestamp for polling

    // Verify the caller belongs to this conversation
    const convFilter =
      auth.payload.role === "customer"
        ? { _id: conversationId, customerId: auth.payload.userId }
        : { _id: conversationId, salonId: auth.payload.salonId };

    const conversation = await Conversation.findOne(convFilter)
      .populate("customerId", "name email phone")
      .populate("salonId", "name");

    if (!conversation) return errorResponse("Conversation not found", 404);

    // ── POLL MODE ────────────────────────────────────────────────────────────
    if (after) {
      const afterDate = new Date(after);
      if (isNaN(afterDate.getTime())) return errorResponse("Invalid 'after' timestamp", 422);

      const newMessages = await Message.find({
        conversationId,
        createdAt: { $gt: afterDate },
      })
        .populate("senderId", "name")
        .sort({ createdAt: 1 })
        .lean();

      return successResponse(
        { messages: newMessages, hasNew: newMessages.length > 0 },
        "Poll complete"
      );
    }

    // ── HISTORY MODE ─────────────────────────────────────────────────────────
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

    // Mark caller's unread count as 0 when loading history
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
        pagination: {
          page,
          limit,
          total,
          hasMore: skip + messages.length < total,
        },
      },
      "Thread loaded"
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(msg, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/messages/:conversationId
//
// Send a message inside an EXISTING conversation (the main "send" action).
// Use this after the chat screen is already open.
//
// Body: { text: string }
//
// Response: { message, conversation: { lastMessage, lastMessageAt, messageCount, unreadCount } }
// Append the returned `message` to your local messages array — no need to reload the thread.
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { conversationId } = await params;
    const body = await req.json();

    const missing = validateRequiredFields(body, ["text"]);
    if (missing) return errorResponse(missing, 422);

    const text = String(body.text).trim();
    if (!text) return errorResponse("Message text cannot be empty", 422);

    // Verify caller belongs to this conversation
    const convFilter =
      auth.payload.role === "customer"
        ? { _id: conversationId, customerId: auth.payload.userId }
        : { _id: conversationId, salonId: auth.payload.salonId };

    const conversation = await Conversation.findOne(convFilter);
    if (!conversation) return errorResponse("Conversation not found", 404);
    if (!conversation.isActive) return errorResponse("This conversation is closed", 403);

    // Save message
    const senderRole = auth.payload.role as "customer" | "owner" | "staff";
    const newMessage = await Message.create({
      conversationId: conversation._id,
      salonId:    conversation.salonId,
      senderId:   auth.payload.userId,
      senderRole,
      text,
    });

    // Update conversation summary
    conversation.lastMessage   = text;
    conversation.lastMessageAt = newMessage.createdAt as Date;
    conversation.lastMessageBy = senderRole;
    conversation.messageCount  = (conversation.messageCount || 0) + 1;
    if (senderRole === "customer") {
      conversation.unreadBySalon += 1;
    } else {
      conversation.unreadByCustomer += 1;
    }
    await conversation.save();

    const isCustomer = senderRole === "customer";

    return successResponse(
      {
        message: newMessage,
        conversation: {
          _id:            conversation._id,
          lastMessage:    conversation.lastMessage,
          lastMessageAt:  conversation.lastMessageAt,
          lastMessageBy:  conversation.lastMessageBy,
          messageCount:   conversation.messageCount,
          // unreadCount for the OTHER side (to show badge in their list)
          unreadCount: isCustomer
            ? conversation.unreadBySalon
            : conversation.unreadByCustomer,
        },
      },
      "Message sent",
      201
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

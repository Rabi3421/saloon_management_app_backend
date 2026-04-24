import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Conversation, Message } from "@/models/Message";
import "@/models/User";  // register User schema for populate
import "@/models/Salon"; // register Salon schema for populate
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse, validateRequiredFields } from "@/lib/apiHelpers";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messages
// List all conversations for the logged-in user.
//
// Returns per conversation:
//   _id, subject, salonId { _id, name }, customerId { _id, name, phone },
//   lastMessage, lastMessageAt, lastMessageBy, messageCount,
//   unreadCount (caller-side), isActive, createdAt, updatedAt
// ─────────────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();

    const isCustomer = auth.payload.role === "customer";
    const filter = isCustomer
      ? { customerId: auth.payload.userId }
      : { salonId: auth.payload.salonId };

    const conversations = await Conversation.find(filter)
      .populate("customerId", "name email phone")
      .populate("salonId", "name")
      .sort({ lastMessageAt: -1 })
      .lean();

    const data = conversations.map((c) => ({
      _id:            c._id,
      subject:        c.subject ?? null,
      salonId:        c.salonId,
      customerId:     c.customerId,
      lastMessage:    c.lastMessage ?? null,
      lastMessageAt:  c.lastMessageAt ?? null,
      lastMessageBy:  c.lastMessageBy ?? null,
      messageCount:   c.messageCount,
      unreadCount:    isCustomer ? c.unreadByCustomer : c.unreadBySalon,
      isActive:       c.isActive,
      createdAt:      c.createdAt,
      updatedAt:      c.updatedAt,
    }));

    return successResponse(data, "Conversations fetched");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(msg, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/messages
// Start a NEW conversation and send the first message.
// If a conversation already exists between the pair, simply send in that thread.
// (WhatsApp-style: one thread per customer↔salon pair)
//
// Customer body : { text: string, salonId: string, subject?: string }
// Salon body    : { text: string, customerId: string, subject?: string }
//
// Response: { conversation, message }
// After this call, open the thread via GET /api/messages/:conversationId
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const body = await req.json();

    const missing = validateRequiredFields(body, ["text"]);
    if (missing) return errorResponse(missing, 422);

    const text = String(body.text).trim();
    if (!text) return errorResponse("Message text cannot be empty", 422);

    let salonId: string;
    let customerId: string;

    if (auth.payload.role === "customer") {
      if (!body.salonId) return errorResponse("salonId is required", 422);
      salonId = body.salonId;
      customerId = auth.payload.userId;
    } else {
      if (!body.customerId) return errorResponse("customerId is required", 422);
      salonId = auth.payload.salonId!;
      customerId = body.customerId;
    }

    // Find or create the conversation (one thread per pair)
    let conversation = await Conversation.findOne({ salonId, customerId });
    const isNew = !conversation;

    if (!conversation) {
      conversation = await Conversation.create({
        salonId,
        customerId,
        subject: body.subject?.trim() || undefined,
      });
    }

    // Save the message
    const newMessage = await Message.create({
      conversationId: conversation._id,
      salonId,
      senderId:   auth.payload.userId,
      senderRole: auth.payload.role as "customer" | "owner" | "staff",
      text,
    });

    // Update conversation summary
    const senderRole = auth.payload.role as "customer" | "owner" | "staff";
    conversation.lastMessage    = text;
    conversation.lastMessageAt  = newMessage.createdAt as Date;
    conversation.lastMessageBy  = senderRole;
    conversation.messageCount   = (conversation.messageCount || 0) + 1;
    if (senderRole === "customer") {
      conversation.unreadBySalon += 1;
    } else {
      conversation.unreadByCustomer += 1;
    }
    await conversation.save();

    // Populate for rich response
    await conversation.populate("customerId", "name email phone");
    await conversation.populate("salonId", "name");

    return successResponse(
      { conversation, message: newMessage, isNewConversation: isNew },
      isNew ? "Conversation started" : "Message sent",
      201
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(msg, 500);
  }
}

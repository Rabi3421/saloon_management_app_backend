import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Conversation } from "@/models/Message";
import "@/models/User";  // register User schema for populate
import "@/models/Salon"; // register Salon schema for populate
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/messages
// List all conversations for the logged-in user, sorted by most recent.
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
      _id:           c._id,
      subject:       c.subject ?? null,
      salonId:       c.salonId,
      customerId:    c.customerId,
      lastMessage:   c.lastMessage ?? null,
      lastMessageAt: c.lastMessageAt ?? null,
      lastMessageBy: c.lastMessageBy ?? null,
      messageCount:  c.messageCount,
      unreadCount:   isCustomer ? c.unreadByCustomer : c.unreadBySalon,
      isActive:      c.isActive,
      createdAt:     c.createdAt,
      updatedAt:     c.updatedAt,
    }));

    return successResponse(data, "Conversations fetched");
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(msg, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/messages
// Create or find an existing conversation thread.
// (WhatsApp-style: one thread per customer↔salon pair — no duplicate threads)
//
// After getting the conversationId, connect via Socket.io and emit
// "join_conversation" + "send_message" for real-time messaging.
//
// Customer body : { salonId: string, subject?: string }
// Salon body    : { customerId: string, subject?: string }
//
// Response: { conversation, isNewConversation }
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const body = await req.json();

    let salonId: string;
    let customerId: string;

    if (auth.payload.role === "customer") {
      if (!body.salonId) return errorResponse("salonId is required", 422);
      salonId    = body.salonId;
      customerId = auth.payload.userId;
    } else {
      if (!body.customerId) return errorResponse("customerId is required", 422);
      salonId    = auth.payload.salonId!;
      customerId = body.customerId;
    }

    // Find or create the conversation (one thread per pair)
    let conversation = await Conversation.findOne({ salonId, customerId })
      .populate("customerId", "name email phone")
      .populate("salonId", "name");
    const isNew = !conversation;

    if (!conversation) {
      const created = await Conversation.create({
        salonId,
        customerId,
        subject: body.subject?.trim() || undefined,
      });
      // Re-fetch with population
      conversation = await Conversation.findById(created._id)
        .populate("customerId", "name email phone")
        .populate("salonId", "name");
    }

    return successResponse(
      { conversation, isNewConversation: isNew },
      isNew ? "Conversation created" : "Conversation found",
      isNew ? 201 : 200
    );
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(msg, 500);
  }
}

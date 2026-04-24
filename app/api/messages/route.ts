import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Conversation, Message } from "@/models/Message";
import "@/models/User"; // ensure User schema is registered for populate
import "@/models/Salon"; // ensure Salon schema is registered for populate
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse, validateRequiredFields } from "@/lib/apiHelpers";

/**
 * GET /api/messages
 * List all conversations for the logged-in user.
 * - Customers see their conversations with salons.
 * - Owners/staff see all conversations for their salon.
 *
 * Response shape per conversation:
 *   { _id, salonId { _id, name }, customerId { _id, name, phone },
 *     lastMessage, lastMessageAt, unreadCount, createdAt }
 */
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

    // Attach the relevant unread count for the calling side
    const data = conversations.map((c) => ({
      ...c,
      unreadCount: isCustomer ? c.unreadByCustomer : c.unreadBySalon,
    }));

    return successResponse(data, "Conversations fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/messages
 * Send a message. Creates conversation if it doesn't exist yet.
 *
 * Customer body : { text: string, salonId: string }
 * Salon body    : { text: string, customerId: string }
 *
 * Returns: { message, conversationId, unreadCount }
 */
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
      // owner or staff
      if (!body.customerId) return errorResponse("customerId is required", 422);
      salonId = auth.payload.salonId!;
      customerId = body.customerId;
    }

    // Find or create conversation
    let conversation = await Conversation.findOne({ salonId, customerId });
    if (!conversation) {
      conversation = await Conversation.create({ salonId, customerId });
    }

    const newMessage = await Message.create({
      conversationId: conversation._id,
      salonId,
      senderId: auth.payload.userId,
      senderRole: auth.payload.role as "customer" | "owner" | "staff",
      text,
    });

    // Update conversation summary
    conversation.lastMessage = text;
    conversation.lastMessageAt = new Date();
    if (auth.payload.role === "customer") {
      conversation.unreadBySalon += 1;
    } else {
      conversation.unreadByCustomer += 1;
    }
    await conversation.save();

    return successResponse(
      {
        message: newMessage,
        conversationId: conversation._id,
        unreadCount:
          auth.payload.role === "customer"
            ? conversation.unreadBySalon
            : conversation.unreadByCustomer,
      },
      "Message sent",
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

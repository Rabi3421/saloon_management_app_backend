import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Conversation, Message } from "@/models/Message";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse, validateRequiredFields } from "@/lib/apiHelpers";

/**
 * GET /api/messages
 * List all conversations for the logged-in user.
 * - Customers see their conversations with salons.
 * - Owners/staff see all conversations for their salon.
 */
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();

    const filter =
      auth.payload.role === "customer"
        ? { customerId: auth.payload.userId }
        : { salonId: auth.payload.salonId };

    const conversations = await Conversation.find(filter)
      .populate("customerId", "name email phone")
      .populate("salonId", "name")
      .sort({ lastMessageAt: -1 });

    return successResponse(conversations, "Conversations fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/messages
 * Send a message. Creates conversation if it doesn't exist yet.
 * Body: { text, recipientSalonId? (for customers) | recipientCustomerId? (for salon) }
 */
export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const body = await req.json();

    const missing = validateRequiredFields(body, ["text"]);
    if (missing) return errorResponse(missing, 422);

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

    const message = await Message.create({
      conversationId: conversation._id,
      salonId,
      senderId: auth.payload.userId,
      senderRole: auth.payload.role as "customer" | "owner" | "staff",
      text: body.text,
    });

    // Update conversation summary
    conversation.lastMessage = body.text;
    conversation.lastMessageAt = new Date();
    if (auth.payload.role === "customer") {
      conversation.unreadBySalon += 1;
    } else {
      conversation.unreadByCustomer += 1;
    }
    await conversation.save();

    return successResponse({ message, conversation }, "Message sent", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

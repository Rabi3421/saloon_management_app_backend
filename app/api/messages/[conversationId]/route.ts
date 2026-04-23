import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { Conversation, Message } from "@/models/Message";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

type RouteContext = { params: Promise<{ conversationId: string }> };

/**
 * GET /api/messages/:conversationId
 * Returns all messages in a conversation thread.
 * Also marks the unread count as 0 for the reader's side.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { conversationId } = await params;

    // Verify the requester belongs to this conversation
    const convFilter =
      auth.payload.role === "customer"
        ? { _id: conversationId, customerId: auth.payload.userId }
        : { _id: conversationId, salonId: auth.payload.salonId };

    const conversation = await Conversation.findOne(convFilter)
      .populate("customerId", "name email phone")
      .populate("salonId", "name");

    if (!conversation) return errorResponse("Conversation not found", 404);

    const messages = await Message.find({ conversationId })
      .populate("senderId", "name role")
      .sort({ createdAt: 1 });

    // Mark unread as 0 for the reader
    if (auth.payload.role === "customer") {
      conversation.unreadByCustomer = 0;
    } else {
      conversation.unreadBySalon = 0;
    }
    await conversation.save();

    return successResponse({ conversation, messages }, "Messages fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

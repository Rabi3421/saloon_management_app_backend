import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import { authenticate, isAuthError } from "@/middleware/auth";
import { errorResponse, successResponse } from "@/lib/apiHelpers";

type RouteContext = { params: Promise<{ id: string }> };

function isSalonSide(role: string) {
  return role === "owner" || role === "staff" || role === "admin";
}

type MessageShape = {
  _id: unknown;
  text: string;
  senderId: unknown;
  senderRole: string;
  createdAt?: Date | string;
  toObject?: () => Record<string, unknown>;
};

function toMessageDto(message: MessageShape) {
  return {
    _id: String(message._id),
    text: message.text,
    senderId: String(message.senderId),
    senderRole: message.senderRole,
    from: message.senderRole === "customer" ? "user" : "salon",
    createdAt: message.createdAt,
  };
}

async function findAuthorizedConversation(id: string, auth: { payload: { userId: string; salonId: string | null; role: string } }) {
  const filter = isSalonSide(auth.payload.role)
    ? { _id: id, salonId: auth.payload.salonId, isActive: true }
    : {
        _id: id,
        salonId: auth.payload.salonId,
        customerId: auth.payload.userId,
        isActive: true,
      };

  return Conversation.findOne(filter);
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { id } = await params;
    const conversation = await findAuthorizedConversation(id, auth);

    if (!conversation) return errorResponse("Conversation not found", 404);

    const { searchParams } = new URL(req.url);
    const after = searchParams.get("after");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));

    if (after) {
      const messages = await Message.find({
        conversationId: conversation._id,
        createdAt: { $gt: new Date(after) },
      }).sort({ createdAt: 1 });

      return successResponse(
        {
          messages: messages.map(toMessageDto),
          hasNew: messages.length > 0,
        },
        "Messages fetched"
      );
    }

    const skip = Math.max(0, (page - 1) * limit);
    const [messages, total] = await Promise.all([
      Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 }).skip(skip).limit(limit),
      Message.countDocuments({ conversationId: conversation._id }),
    ]);

    return successResponse(
      {
        conversation: {
          _id: String(conversation._id),
          salonId: String(conversation.salonId),
          customerId: String(conversation.customerId),
          lastMessage: conversation.lastMessage,
          lastMessageAt: conversation.lastMessageAt,
        },
        messages: messages.map(toMessageDto),
        pagination: {
          page,
          limit,
          total,
          hasMore: skip + messages.length < total,
        },
      },
      "Conversation fetched"
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { id } = await params;
    const conversation = await findAuthorizedConversation(id, auth);

    if (!conversation) return errorResponse("Conversation not found", 404);

    const body = await req.json();
    const text = String(body.text ?? "").trim();
    if (!text) return errorResponse("text is required", 422);

    const message = await Message.create({
      conversationId: conversation._id,
      salonId: conversation.salonId,
      customerId: conversation.customerId,
      senderId: auth.payload.userId,
      senderRole: auth.payload.role,
      text,
    });

    const createdAt = new Date();
    conversation.lastMessage = text;
    conversation.lastMessageAt = createdAt;
    conversation.lastMessageBy = auth.payload.role;
    conversation.messageCount = (conversation.messageCount ?? 0) + 1;
    if (auth.payload.role === "customer") {
      conversation.unreadSalonCount = (conversation.unreadSalonCount ?? 0) + 1;
      conversation.unreadCustomerCount = 0;
    } else {
      conversation.unreadCustomerCount = (conversation.unreadCustomerCount ?? 0) + 1;
      conversation.unreadSalonCount = 0;
    }
    await conversation.save();

    return successResponse(
      {
        message: toMessageDto({ ...message.toObject(), createdAt }),
        conversation: {
          _id: String(conversation._id),
          salonId: String(conversation.salonId),
          customerId: String(conversation.customerId),
          lastMessage: conversation.lastMessage,
          lastMessageAt: conversation.lastMessageAt,
        },
      },
      "Message sent",
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { id } = await params;
    const conversation = await findAuthorizedConversation(id, auth);

    if (!conversation) return errorResponse("Conversation not found", 404);

    if (isSalonSide(auth.payload.role)) {
      conversation.unreadSalonCount = 0;
    } else {
      conversation.unreadCustomerCount = 0;
    }
    await conversation.save();

    return successResponse(null, "Conversation marked as read");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import Conversation from "@/models/Conversation";
import Message from "@/models/Message";
import User from "@/models/User";
import { authenticate, isAuthError } from "@/middleware/auth";
import { errorResponse, successResponse } from "@/lib/apiHelpers";
import { notifySalonOwners, notifyUsers } from "@/lib/notificationService";

function isSalonSide(role: string) {
  return role === "owner" || role === "staff" || role === "admin";
}

type ConversationShape = {
  _id: unknown;
  subject?: string;
  salonId: unknown;
  customerId: unknown;
  lastMessage?: string;
  lastMessageAt?: Date | null;
  lastMessageBy?: string;
  messageCount?: number;
  unreadCustomerCount?: number;
  unreadSalonCount?: number;
  isActive?: boolean;
  save?: () => Promise<unknown>;
};

type MessageShape = {
  _id: unknown;
  text: string;
  senderId: unknown;
  senderRole: string;
  createdAt?: Date | string;
  toObject?: () => Record<string, unknown>;
};

function toConversationDto(conversation: ConversationShape, role: string) {
  return {
    _id: String(conversation._id),
    subject: conversation.subject,
    salonId: conversation.salonId,
    customerId: conversation.customerId,
    lastMessage: conversation.lastMessage,
    lastMessageAt: conversation.lastMessageAt,
    lastMessageBy: conversation.lastMessageBy,
    messageCount: conversation.messageCount,
    unreadCount: isSalonSide(role)
      ? conversation.unreadSalonCount ?? 0
      : conversation.unreadCustomerCount ?? 0,
    isActive: conversation.isActive,
  };
}

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

async function appendMessage(conversation: ConversationShape, text: string, senderId: string, senderRole: string) {
  const createdAt = new Date();
  const message = (await Message.create({
    conversationId: String(conversation._id),
    salonId: String(conversation.salonId),
    customerId: String(conversation.customerId),
    senderId,
    senderRole,
    text,
  })) as MessageShape;

  const isCustomerSender = senderRole === "customer";
  conversation.lastMessage = text;
  conversation.lastMessageAt = createdAt;
  conversation.lastMessageBy = senderRole;
  conversation.messageCount = (conversation.messageCount ?? 0) + 1;
  conversation.unreadCustomerCount = isCustomerSender
    ? 0
    : (conversation.unreadCustomerCount ?? 0) + 1;
  conversation.unreadSalonCount = isCustomerSender
    ? (conversation.unreadSalonCount ?? 0) + 1
    : 0;
  if (conversation.save) await conversation.save();

  return { message, createdAt };
}

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();

    const filter = isSalonSide(auth.payload.role)
      ? { salonId: auth.payload.salonId, isActive: true }
      : { customerId: auth.payload.userId, salonId: auth.payload.salonId, isActive: true };

    const conversations = await Conversation.find(filter)
      .populate("salonId", "name")
      .populate("customerId", "name phone")
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    return successResponse(
      conversations.map((conversation) => toConversationDto(conversation, auth.payload.role)),
      "Conversations fetched"
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const body = await req.json();
    const text = String(body.text ?? "").trim();
    const subject = String(body.subject ?? "").trim();

    if (!text) return errorResponse("text is required", 422);

    const salonRole = isSalonSide(auth.payload.role);
    const salonId = auth.payload.salonId;
    const customerId = salonRole ? String(body.customerId ?? "") : auth.payload.userId;

    if (!salonId) return errorResponse("Salon context is missing", 400);
    if (!customerId) return errorResponse("customerId is required", 422);

    let conversation = await Conversation.findOne({ salonId, customerId, isActive: true });
    const isNewConversation = !conversation;

    if (!conversation) {
      conversation = await Conversation.create({
        salonId,
        customerId,
        subject,
      });
    }

    const { message, createdAt } = await appendMessage(
      conversation,
      text,
      auth.payload.userId,
      auth.payload.role
    );

    const populatedConversation = await Conversation.findById(conversation._id)
      .populate("salonId", "name")
      .populate("customerId", "name phone");

    const conversationId = String(conversation._id);
    const customerName =
      populatedConversation && typeof populatedConversation.customerId === "object"
        ? String((populatedConversation.customerId as { name?: string }).name ?? "Customer")
        : "Customer";
    const salonName =
      populatedConversation && typeof populatedConversation.salonId === "object"
        ? String((populatedConversation.salonId as { name?: string }).name ?? "Salon")
        : "Salon";

    if (salonRole) {
      await notifyUsers({
        userIds: [customerId],
        salonId,
        type: "chat",
        title: `New message from ${salonName}`,
        body: text,
        meta: { conversationId, targetScreen: "Message" },
      });
    } else {
      const sender = await User.findById(auth.payload.userId).select("name");
      await notifySalonOwners({
        salonId,
        type: "chat",
        title: `New message from ${sender?.name ?? customerName}`,
        body: text,
        meta: { conversationId, customerId, targetScreen: "OwnerMessages" },
      });
    }

    return successResponse(
      {
        conversationId: String(conversation._id),
        conversation: populatedConversation
          ? toConversationDto(populatedConversation, auth.payload.role)
          : null,
        message: toMessageDto({
          _id: message._id,
          senderId: auth.payload.userId,
          senderRole: auth.payload.role,
          text,
          createdAt,
        }),
        unreadCount: salonRole
          ? conversation.unreadSalonCount ?? 0
          : conversation.unreadCustomerCount ?? 0,
        isNewConversation,
      },
      "Message sent",
      201
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

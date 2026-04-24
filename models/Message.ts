import mongoose, { Document, Schema, Model } from "mongoose";

/**
 * Conversation — one thread per (salonId + customerId) pair.
 * Think of it as the WhatsApp chat window between a customer and a salon.
 * All messages between them live in this single thread.
 *
 * For email-style multi-thread support in future, remove the unique index
 * and add a `subject` field.
 */
export interface IConversation extends Document {
  salonId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  subject?: string;           // optional email-style subject line
  lastMessage?: string;       // preview text
  lastMessageAt?: Date;
  lastMessageBy?: "customer" | "owner" | "staff"; // who sent last
  messageCount: number;       // total messages in thread
  unreadByCustomer: number;
  unreadBySalon: number;
  isActive: boolean;          // soft-close a thread
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    salonId:            { type: Schema.Types.ObjectId, ref: "Salon", required: true },
    customerId:         { type: Schema.Types.ObjectId, ref: "User",  required: true },
    subject:            { type: String, maxlength: 200 },
    lastMessage:        { type: String },
    lastMessageAt:      { type: Date },
    lastMessageBy:      { type: String, enum: ["customer", "owner", "staff"] },
    messageCount:       { type: Number, default: 0 },
    unreadByCustomer:   { type: Number, default: 0 },
    unreadBySalon:      { type: Number, default: 0 },
    isActive:           { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One active conversation per customer per salon (WhatsApp-style).
// Remove this index if you want multiple threads per pair (email-style).
ConversationSchema.index({ salonId: 1, customerId: 1 }, { unique: true });

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  salonId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: "customer" | "owner" | "staff";
  text: string;
  isRead: boolean;
  readAt?: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: {
      type: Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
      index: true,
    },
    salonId:    { type: Schema.Types.ObjectId, ref: "Salon", required: true },
    senderId:   { type: Schema.Types.ObjectId, ref: "User",  required: true },
    senderRole: { type: String, enum: ["customer", "owner", "staff"], required: true },
    text:       { type: String, required: true, trim: true, maxlength: 5000 },
    isRead:     { type: Boolean, default: false },
    readAt:     { type: Date },
  },
  { timestamps: true }
);

// Index for efficient "poll new messages since timestamp" queries
MessageSchema.index({ conversationId: 1, createdAt: 1 });

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);

export const Message: Model<IMessage> =
  mongoose.models.Message ||
  mongoose.model<IMessage>("Message", MessageSchema);

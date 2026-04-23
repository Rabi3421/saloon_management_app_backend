import mongoose, { Document, Schema, Model } from "mongoose";

// A conversation between a customer and a salon (owner/staff)
export interface IConversation extends Document {
  salonId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  lastMessage?: string;
  lastMessageAt?: Date;
  unreadByCustomer: number;
  unreadBySalon: number;
}

const ConversationSchema = new Schema<IConversation>(
  {
    salonId: { type: Schema.Types.ObjectId, ref: "Salon", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    lastMessage: { type: String },
    lastMessageAt: { type: Date },
    unreadByCustomer: { type: Number, default: 0 },
    unreadBySalon: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// One conversation per customer per salon
ConversationSchema.index({ salonId: 1, customerId: 1 }, { unique: true });

export interface IMessage extends Document {
  conversationId: mongoose.Types.ObjectId;
  salonId: mongoose.Types.ObjectId;
  senderId: mongoose.Types.ObjectId;
  senderRole: "customer" | "owner" | "staff";
  text: string;
  isRead: boolean;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },
    salonId: { type: Schema.Types.ObjectId, ref: "Salon", required: true },
    senderId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderRole: { type: String, enum: ["customer", "owner", "staff"], required: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);

export const Message: Model<IMessage> =
  mongoose.models.Message ||
  mongoose.model<IMessage>("Message", MessageSchema);

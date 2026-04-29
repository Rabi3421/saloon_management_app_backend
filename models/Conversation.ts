import mongoose, { Document, Model, Schema } from "mongoose";

export interface IConversation extends Document {
  salonId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  subject?: string;
  lastMessage?: string;
  lastMessageAt?: Date;
  lastMessageBy?: string;
  messageCount: number;
  unreadCustomerCount: number;
  unreadSalonCount: number;
  isActive: boolean;
}

const ConversationSchema = new Schema<IConversation>(
  {
    salonId: {
      type: Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
      index: true,
    },
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    subject: { type: String, trim: true, default: "" },
    lastMessage: { type: String, trim: true, default: "" },
    lastMessageAt: { type: Date, default: null },
    lastMessageBy: { type: String, trim: true, default: "" },
    messageCount: { type: Number, default: 0 },
    unreadCustomerCount: { type: Number, default: 0 },
    unreadSalonCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ConversationSchema.index({ salonId: 1, customerId: 1 }, { unique: true });
ConversationSchema.index({ salonId: 1, lastMessageAt: -1 });
ConversationSchema.index({ customerId: 1, lastMessageAt: -1 });

const Conversation: Model<IConversation> =
  mongoose.models.Conversation ||
  mongoose.model<IConversation>("Conversation", ConversationSchema);

export default Conversation;

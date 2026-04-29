import mongoose, { Document, Schema, Model } from "mongoose";

export type NotificationType = "booking" | "promotion" | "reminder" | "system" | "chat";

export interface INotification extends Document {
  userId: mongoose.Types.ObjectId;
  salonId?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  body: string;
  isRead: boolean;
  meta?: Record<string, unknown>; // e.g. { bookingId: "..." }
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    salonId: { type: Schema.Types.ObjectId, ref: "Salon" },
    type: {
      type: String,
      enum: ["booking", "promotion", "reminder", "system", "chat"],
      default: "system",
    },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true },
    isRead: { type: Boolean, default: false },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

const existingNotificationModel =
  mongoose.models.Notification as Model<INotification> | undefined;
const shouldRefreshNotificationModel =
  !!existingNotificationModel &&
  !existingNotificationModel.schema.path("type")?.options?.enum?.includes("chat");

if (shouldRefreshNotificationModel) {
  mongoose.deleteModel("Notification");
}

const Notification: Model<INotification> =
  (shouldRefreshNotificationModel
    ? undefined
    : (mongoose.models.Notification as Model<INotification> | undefined)) ||
  mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;

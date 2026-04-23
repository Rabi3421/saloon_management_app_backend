import mongoose, { Document, Schema, Model } from "mongoose";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled";

export type PaymentStatus = "unpaid" | "paid";

export interface IBooking extends Document {
  salonId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  staffId: mongoose.Types.ObjectId;
  serviceId: mongoose.Types.ObjectId;   // kept for single-service backward compat
  serviceIds: mongoose.Types.ObjectId[]; // multi-service support
  bookingDate: Date;
  timeSlot: string;
  status: BookingStatus;
  notes?: string;
  totalAmount: number;
  paymentStatus: PaymentStatus;
}

const BookingSchema = new Schema<IBooking>(
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
    },
    staffId: {
      type: Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    serviceId: {
      type: Schema.Types.ObjectId,
      ref: "Service",
      required: false, // optional when serviceIds is used
    },
    serviceIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
    bookingDate: { type: Date, required: true },
    timeSlot: { type: String, required: true, trim: true }, // e.g. "10:00 AM"
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled"],
      default: "pending",
    },
    notes: { type: String, trim: true },
    totalAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ["unpaid", "paid"], default: "unpaid" },
  },
  { timestamps: true }
);

const Booking: Model<IBooking> =
  mongoose.models.Booking ||
  mongoose.model<IBooking>("Booking", BookingSchema);

export default Booking;

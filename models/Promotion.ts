import mongoose, { Document, Model, Schema } from "mongoose";

export type PromotionType =
  | "percentage"
  | "flat"
  | "gift_voucher"
  | "free_service";

export interface IPromotion extends Document {
  salonId: mongoose.Types.ObjectId;
  title: string;
  code: string;
  description?: string;
  terms?: string;
  type: PromotionType;
  value: number;
  minBookingAmount: number;
  startsAt?: Date;
  endsAt?: Date;
  appliesToServiceIds: mongoose.Types.ObjectId[];
  usageLimit?: number;
  usageCount: number;
  isActive: boolean;
}

const PromotionSchema = new Schema<IPromotion>(
  {
    salonId: {
      type: Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, trim: true },
    terms: { type: String, trim: true },
    type: {
      type: String,
      enum: ["percentage", "flat", "gift_voucher", "free_service"],
      required: true,
    },
    value: { type: Number, default: 0 },
    minBookingAmount: { type: Number, default: 0 },
    startsAt: { type: Date },
    endsAt: { type: Date },
    appliesToServiceIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "Service",
      },
    ],
    usageLimit: { type: Number },
    usageCount: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

PromotionSchema.index({ salonId: 1, code: 1 }, { unique: true });

const Promotion: Model<IPromotion> =
  mongoose.models.Promotion ||
  mongoose.model<IPromotion>("Promotion", PromotionSchema);

export default Promotion;

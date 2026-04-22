import mongoose, { Document, Schema, Model } from "mongoose";

export interface ISalon extends Document {
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  plan: "basic" | "premium";
  isActive: boolean;
  createdAt: Date;
}

const SalonSchema = new Schema<ISalon>(
  {
    name: { type: String, required: true, trim: true },
    ownerName: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    plan: { type: String, enum: ["basic", "premium"], default: "basic" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Salon: Model<ISalon> =
  mongoose.models.Salon || mongoose.model<ISalon>("Salon", SalonSchema);

export default Salon;

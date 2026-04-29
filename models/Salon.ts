import mongoose, { Document, Schema, Model } from "mongoose";

export interface ISalon extends Document {
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  about?: string;
  website?: string;
  logo?: string;
  images?: string[];
  openingHours?: Array<{
    day: string;
    start: string;
    end: string;
    closed?: boolean;
  }>;
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
    about: { type: String, trim: true, default: "" },
    website: { type: String, trim: true, default: "" },
    logo: { type: String, trim: true, default: "" },
    images: { type: [String], default: [] },
    openingHours: {
      type: [
        new Schema(
          {
            day: { type: String, required: true },
            start: { type: String, required: true },
            end: { type: String, required: true },
            closed: { type: Boolean, default: false },
          },
          { _id: false }
        ),
      ],
      default: [],
    },
    plan: { type: String, enum: ["basic", "premium"], default: "basic" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Salon: Model<ISalon> =
  mongoose.models.Salon || mongoose.model<ISalon>("Salon", SalonSchema);

export default Salon;

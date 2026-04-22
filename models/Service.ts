import mongoose, { Document, Schema, Model } from "mongoose";

export interface IService extends Document {
  salonId: mongoose.Types.ObjectId;
  name: string;
  price: number;
  duration: number; // in minutes
  category: string;
  isActive: boolean;
}

const ServiceSchema = new Schema<IService>(
  {
    salonId: {
      type: Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    duration: { type: Number, required: true, min: 1 }, // minutes
    category: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Service: Model<IService> =
  mongoose.models.Service || mongoose.model<IService>("Service", ServiceSchema);

export default Service;

import mongoose, { Document, Schema, Model } from "mongoose";

export interface IOtp extends Document {
  email: string;
  otp: string;
  expiresAt: Date;
  used: boolean;
}

const OtpSchema = new Schema<IOtp>({
  email: { type: String, required: true, lowercase: true, index: true },
  otp: { type: String, required: true },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
});

// Auto-delete expired OTPs via TTL index
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Otp: Model<IOtp> =
  mongoose.models.Otp || mongoose.model<IOtp>("Otp", OtpSchema);

export default Otp;

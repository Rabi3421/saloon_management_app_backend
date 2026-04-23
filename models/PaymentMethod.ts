import mongoose, { Document, Schema, Model } from "mongoose";

export interface IPaymentMethod extends Document {
  userId: mongoose.Types.ObjectId;
  cardholderName: string;
  last4: string;
  brand: string; // e.g. "Visa", "Mastercard"
  expiryMonth: string;
  expiryYear: string;
  isDefault: boolean;
}

const PaymentMethodSchema = new Schema<IPaymentMethod>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    cardholderName: { type: String, required: true, trim: true },
    last4: { type: String, required: true, length: 4 },
    brand: { type: String, required: true, trim: true },
    expiryMonth: { type: String, required: true },
    expiryYear: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const PaymentMethod: Model<IPaymentMethod> =
  mongoose.models.PaymentMethod ||
  mongoose.model<IPaymentMethod>("PaymentMethod", PaymentMethodSchema);

export default PaymentMethod;

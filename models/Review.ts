import mongoose, { Document, Schema, Model } from "mongoose";

export interface IReview extends Document {
  salonId: mongoose.Types.ObjectId;
  bookingId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  rating: number; // 1-5
  comment?: string;
}

const ReviewSchema = new Schema<IReview>(
  {
    salonId: { type: Schema.Types.ObjectId, ref: "Salon", required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", required: true, unique: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

const Review: Model<IReview> =
  mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);

export default Review;

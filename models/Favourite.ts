import mongoose, { Document, Schema, Model } from "mongoose";

export interface IFavourite extends Document {
  userId: mongoose.Types.ObjectId;
  salonId: mongoose.Types.ObjectId;
}

const FavouriteSchema = new Schema<IFavourite>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    salonId: { type: Schema.Types.ObjectId, ref: "Salon", required: true },
  },
  { timestamps: true }
);

FavouriteSchema.index({ userId: 1, salonId: 1 }, { unique: true });

const Favourite: Model<IFavourite> =
  mongoose.models.Favourite ||
  mongoose.model<IFavourite>("Favourite", FavouriteSchema);

export default Favourite;

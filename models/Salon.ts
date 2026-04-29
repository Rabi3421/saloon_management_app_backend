import mongoose, { Document, Schema, Model } from "mongoose";

interface ISalonFeatureBanner {
  title: string;
  subtitle?: string;
  image: string;
  ctaLabel?: string;
}

interface ISalonLocation {
  latitude: number;
  longitude: number;
}

export interface ISalon extends Document {
  name: string;
  ownerName: string;
  email: string;
  phone: string;
  address: string;
  about?: string;
  website?: string;
  logo?: string;
  coverImage?: string;
  tagline?: string;
  images?: string[];
  featureBanners?: ISalonFeatureBanner[];
  location?: ISalonLocation;
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

const SalonFeatureBannerSchema = new Schema<ISalonFeatureBanner>(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true, default: "" },
    image: { type: String, required: true, trim: true },
    ctaLabel: { type: String, trim: true, default: "Explore" },
  },
  { _id: false }
);

const SalonLocationSchema = new Schema<ISalonLocation>(
  {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  { _id: false }
);

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
    coverImage: { type: String, trim: true, default: "" },
    tagline: { type: String, trim: true, default: "" },
    images: { type: [String], default: [] },
    featureBanners: { type: [SalonFeatureBannerSchema], default: [] },
    location: { type: SalonLocationSchema, default: undefined },
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

const existingSalonModel = mongoose.models.Salon as Model<ISalon> | undefined;
const shouldRefreshSalonModel =
  !!existingSalonModel &&
  ["coverImage", "tagline", "featureBanners", "location"].some(
    (pathName) => !existingSalonModel.schema.path(pathName)
  );

if (shouldRefreshSalonModel) {
  mongoose.deleteModel("Salon");
}

const Salon: Model<ISalon> =
  (shouldRefreshSalonModel
    ? undefined
    : (mongoose.models.Salon as Model<ISalon> | undefined)) ||
  mongoose.model<ISalon>("Salon", SalonSchema);

export default Salon;

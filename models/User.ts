import mongoose, { Document, Schema, Model } from "mongoose";

export type UserRole = "owner" | "staff" | "customer" | "admin";

export interface IUserDeviceToken {
  token: string;
  platform: "ios" | "android";
  lastSeenAt: Date;
}

export interface IUser extends Document {
  salonId?: mongoose.Types.ObjectId; // optional for super-admin
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  deviceTokens: IUserDeviceToken[];
  createdAt: Date;
}

const UserDeviceTokenSchema = new Schema<IUserDeviceToken>(
  {
    token: { type: String, required: true, trim: true },
    platform: {
      type: String,
      enum: ["ios", "android"],
      required: true,
    },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    salonId: {
      type: Schema.Types.ObjectId,
      ref: "Salon",
      required: false, // super-admin has no salon
      default: null,
    },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 6 },
    role: {
      type: String,
      enum: ["owner", "staff", "customer", "admin"],
      default: "customer",
    },
    isActive: { type: Boolean, default: true },
    deviceTokens: { type: [UserDeviceTokenSchema], default: [] },
  },
  { timestamps: true }
);

UserSchema.index({ "deviceTokens.token": 1 });

// Never return password in JSON responses
UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (ret as any).password;
    return ret;
  },
});

const existingUserModel = mongoose.models.User as Model<IUser> | undefined;
const shouldRefreshUserModel =
  !!existingUserModel && !existingUserModel.schema.path("deviceTokens");

if (shouldRefreshUserModel) {
  mongoose.deleteModel("User");
}

const User: Model<IUser> =
  (shouldRefreshUserModel
    ? undefined
    : (mongoose.models.User as Model<IUser> | undefined)) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;

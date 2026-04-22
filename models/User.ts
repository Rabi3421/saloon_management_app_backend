import mongoose, { Document, Schema, Model } from "mongoose";

export type UserRole = "owner" | "staff" | "customer" | "admin";

export interface IUser extends Document {
  salonId?: mongoose.Types.ObjectId; // optional for super-admin
  name: string;
  email: string;
  phone: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

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
  },
  { timestamps: true }
);

// Never return password in JSON responses
UserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (ret as any).password;
    return ret;
  },
});

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;

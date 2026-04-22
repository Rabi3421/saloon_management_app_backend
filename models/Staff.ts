import mongoose, { Document, Schema, Model } from "mongoose";

export interface IWorkingHours {
  day: string; // e.g. "Monday"
  startTime: string; // e.g. "09:00"
  endTime: string; // e.g. "18:00"
}

export interface IStaff extends Document {
  salonId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  specialization: string;
  workingHours: IWorkingHours[];
  isActive: boolean;
}

const WorkingHoursSchema = new Schema<IWorkingHours>(
  {
    day: { type: String, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
  },
  { _id: false }
);

const StaffSchema = new Schema<IStaff>(
  {
    salonId: {
      type: Schema.Types.ObjectId,
      ref: "Salon",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    specialization: { type: String, required: true, trim: true },
    workingHours: { type: [WorkingHoursSchema], default: [] },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const Staff: Model<IStaff> =
  mongoose.models.Staff || mongoose.model<IStaff>("Staff", StaffSchema);

export default Staff;

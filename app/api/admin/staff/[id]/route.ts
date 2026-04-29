import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";
import User from "@/models/User";
import { authenticate, isAuthError, requireRole } from "@/middleware/auth";
import { errorResponse, successResponse } from "@/lib/apiHelpers";

type Context = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: Context) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const staff = await Staff.findById(id);
    if (!staff) {
      return errorResponse("Staff member not found", 404);
    }

    if (typeof body.password === "string" && body.password.trim()) {
      if (body.password.trim().length < 6) {
        return errorResponse("Password must be at least 6 characters", 422);
      }
    }

    let normalizedEmail: string | undefined;
    if (typeof body.email === "string" && body.email.trim()) {
      normalizedEmail = body.email.trim().toLowerCase();
      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: staff.userId },
      }).lean();
      if (existingUser) {
        return errorResponse("A user with this email already exists", 409);
      }
    }

    const nextEmail = normalizedEmail ?? (staff.email ? String(staff.email).trim().toLowerCase() : "");
    const nextPassword =
      typeof body.password === "string" && body.password.trim()
        ? body.password.trim()
        : "";

    if (!staff.userId && (nextEmail || nextPassword)) {
      if (!nextEmail) {
        return errorResponse("Email is required to create staff login", 422);
      }

      if (!nextPassword) {
        return errorResponse(
          "Password is required to create staff login for this staff member",
          422
        );
      }
    }

    const staffUpdates: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) staffUpdates.name = body.name.trim();
    if (normalizedEmail) staffUpdates.email = normalizedEmail;
    if (typeof body.phone === "string") staffUpdates.phone = body.phone.trim();
    if (typeof body.specialization === "string" && body.specialization.trim()) {
      staffUpdates.specialization = body.specialization.trim();
    }
    if (typeof body.isActive === "boolean") staffUpdates.isActive = body.isActive;
    if (Array.isArray(body.workingHours)) staffUpdates.workingHours = body.workingHours;

    staff.set(staffUpdates);
    await staff.save();

    if (staff.userId) {
      const userUpdates: Record<string, unknown> = {};
      if (staffUpdates.name) userUpdates.name = staffUpdates.name;
      if (normalizedEmail) userUpdates.email = normalizedEmail;
      if (staffUpdates.phone !== undefined) userUpdates.phone = staffUpdates.phone;
      if (typeof staffUpdates.isActive === "boolean") userUpdates.isActive = staffUpdates.isActive;
      if (typeof body.password === "string" && body.password.trim()) {
        userUpdates.password = await bcrypt.hash(body.password.trim(), 12);
      }

      if (Object.keys(userUpdates).length > 0) {
        await User.findByIdAndUpdate(staff.userId, { $set: userUpdates }, { new: true });
      }
    } else if (nextEmail && nextPassword) {
      const user = new User({
        salonId: staff.salonId,
        name: String(staffUpdates.name ?? staff.name).trim(),
        email: nextEmail,
        phone: String(staffUpdates.phone ?? staff.phone ?? "").trim(),
        password: await bcrypt.hash(nextPassword, 12),
        role: "staff",
        isActive:
          typeof staffUpdates.isActive === "boolean"
            ? staffUpdates.isActive
            : Boolean(staff.isActive),
      });
      await user.save();

      staff.userId = user._id;
      if (!staff.email) {
        staff.email = nextEmail;
      }
      await staff.save();
    }

    const populatedStaff = await Staff.findById(staff._id)
      .populate("salonId", "name email plan isActive")
      .populate("userId", "name email phone role isActive createdAt");

    return successResponse(populatedStaff ?? staff, "Staff member updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;
  const roleErr = requireRole(auth.payload, ["admin"]);
  if (roleErr) return roleErr;

  try {
    await connectDB();
    const { id } = await params;

    const staff = await Staff.findById(id);
    if (!staff) {
      return errorResponse("Staff member not found", 404);
    }

    if (staff.userId) {
      await User.findByIdAndDelete(staff.userId);
    }
    await Staff.findByIdAndDelete(id);

    return successResponse(null, "Staff member deleted");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
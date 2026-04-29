import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import Staff from "@/models/Staff";
import User from "@/models/User";
import { authenticate, isAuthError } from "@/middleware/auth";
import { errorResponse, successResponse } from "@/lib/apiHelpers";

type RouteContext = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  if (auth.payload.role !== "owner" && auth.payload.role !== "admin") {
    return errorResponse("Only owners can manage staff credentials", 403);
  }

  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    const staff = await Staff.findOne({ _id: id, salonId: auth.payload.salonId });
    if (!staff) {
      return errorResponse("Staff member not found", 404);
    }

    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }
    if (typeof body.phone === "string") {
      updates.phone = body.phone.trim();
    }
    if (typeof body.specialization === "string" && body.specialization.trim()) {
      updates.specialization = body.specialization.trim();
    }
    if (Array.isArray(body.workingHours)) {
      updates.workingHours = body.workingHours;
    }
    if (typeof body.isActive === "boolean") {
      updates.isActive = body.isActive;
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
      updates.email = normalizedEmail;
    }

    if (typeof body.password === "string" && body.password.trim()) {
      if (body.password.trim().length < 6) {
        return errorResponse("Password must be at least 6 characters", 422);
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

    staff.set(updates);
    await staff.save();

    if (staff.userId) {
      const userUpdates: Record<string, unknown> = {};
      if (updates.name) userUpdates.name = updates.name;
      if (updates.phone !== undefined) userUpdates.phone = updates.phone;
      if (normalizedEmail) userUpdates.email = normalizedEmail;
      if (typeof updates.isActive === "boolean") userUpdates.isActive = updates.isActive;
      if (typeof body.password === "string" && body.password.trim()) {
        userUpdates.password = await bcrypt.hash(body.password.trim(), 10);
      }

      if (Object.keys(userUpdates).length > 0) {
        await User.findByIdAndUpdate(staff.userId, { $set: userUpdates }, { new: true });
      }
    } else if (nextEmail && nextPassword) {
      const user = new User({
        salonId: auth.payload.salonId,
        name: String(updates.name ?? staff.name).trim(),
        email: nextEmail,
        phone: String(updates.phone ?? staff.phone ?? "").trim(),
        password: await bcrypt.hash(nextPassword, 10),
        role: "staff",
        isActive:
          typeof updates.isActive === "boolean" ? updates.isActive : Boolean(staff.isActive),
      });
      await user.save();

      staff.userId = user._id;
      if (!staff.email) {
        staff.email = nextEmail;
      }
      await staff.save();
    }

    return successResponse(staff, "Staff member updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  if (auth.payload.role !== "owner" && auth.payload.role !== "admin") {
    return errorResponse("Only owners can remove staff members", 403);
  }

  try {
    await connectDB();
    const { id } = await params;

    const staff = await Staff.findOne({ _id: id, salonId: auth.payload.salonId });
    if (!staff) {
      return errorResponse("Staff member not found", 404);
    }

    if (staff.userId) {
      await User.findByIdAndDelete(staff.userId);
    }

    await Staff.findByIdAndDelete(staff._id);

    return successResponse(null, "Staff member removed");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
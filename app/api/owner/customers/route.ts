import { NextRequest } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Booking from "@/models/Booking";
import { authenticate, isAuthError, requireRole } from "@/middleware/auth";
import { errorResponse, successResponse } from "@/lib/apiHelpers";

interface CustomerSummary {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: Date;
  totalBookings: number;
  confirmedBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalSpent: number;
  lastBookingAt?: Date | null;
}

export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  const roleError = requireRole(auth.payload, ["owner", "staff"]);
  if (roleError) return roleError;

  if (!auth.payload.salonId) {
    return errorResponse("Salon context missing for this account", 400);
  }

  try {
    await connectDB();
    const salonObjectId = new mongoose.Types.ObjectId(auth.payload.salonId);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const status = searchParams.get("status")?.trim() ?? "all";

    const userFilter: Record<string, unknown> = {
      salonId: salonObjectId,
      role: "customer",
    };

    if (status === "active") userFilter.isActive = true;
    if (status === "inactive") userFilter.isActive = false;
    if (search) {
      userFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    const customers = await User.find(userFilter)
      .select("name email phone isActive createdAt")
      .sort({ createdAt: -1 })
      .lean();

    const customerIds = customers.map((customer) => customer._id);

    const bookingStats = await Booking.aggregate<{
      _id: string;
      totalBookings: number;
      confirmedBookings: number;
      completedBookings: number;
      cancelledBookings: number;
      totalSpent: number;
      lastBookingAt?: Date | null;
    }>([
      {
        $match: {
          salonId: salonObjectId,
          customerId: { $in: customerIds },
        },
      },
      {
        $group: {
          _id: "$customerId",
          totalBookings: { $sum: 1 },
          confirmedBookings: {
            $sum: { $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0] },
          },
          completedBookings: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          cancelledBookings: {
            $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] },
          },
          totalSpent: {
            $sum: {
              $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$totalAmount", 0],
            },
          },
          lastBookingAt: { $max: "$createdAt" },
        },
      },
    ]);

    const statsByCustomerId = new Map(
      bookingStats.map((item) => [String(item._id), item]),
    );

    const payload: CustomerSummary[] = customers.map((customer) => {
      const stats = statsByCustomerId.get(String(customer._id));
      return {
        _id: String(customer._id),
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        isActive: Boolean(customer.isActive),
        createdAt: customer.createdAt,
        totalBookings: stats?.totalBookings ?? 0,
        confirmedBookings: stats?.confirmedBookings ?? 0,
        completedBookings: stats?.completedBookings ?? 0,
        cancelledBookings: stats?.cancelledBookings ?? 0,
        totalSpent: stats?.totalSpent ?? 0,
        lastBookingAt: stats?.lastBookingAt ?? null,
      };
    });

    return successResponse(payload, "Salon customers fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

export async function PATCH(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  const roleError = requireRole(auth.payload, ["owner"]);
  if (roleError) return roleError;

  if (!auth.payload.salonId) {
    return errorResponse("Salon context missing for this account", 400);
  }

  try {
    await connectDB();

    const body = await req.json();
    const customerId = String(body.customerId ?? "").trim();

    if (!customerId) {
      return errorResponse("customerId is required", 422);
    }

    const customer = await User.findOne({
      _id: customerId,
      salonId: auth.payload.salonId,
      role: "customer",
    });

    if (!customer) {
      return errorResponse("Customer not found in this salon", 404);
    }

    customer.isActive = body.isActive !== undefined ? Boolean(body.isActive) : !customer.isActive;
    await customer.save();

    return successResponse(customer.toJSON(), "Customer status updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}
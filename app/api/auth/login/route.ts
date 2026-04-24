import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Salon from "@/models/Salon";
import { signToken } from "@/lib/jwt";
import {
  clearDashboardAuthCookies,
  setDashboardAuthCookies,
} from "@/lib/authCookies";
import {
  successResponse,
  errorResponse,
  validateRequiredFields,
} from "@/lib/apiHelpers";

export async function POST(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();

    const missingField = validateRequiredFields(body, ["email", "password"]);
    if (missingField) return errorResponse(missingField, 422);

    const { email, password } = body;

    // X-Salon-ID is required for all non-admin logins.
    // This prevents a user from one salon logging in via another salon's app.
    const salonHeader = req.headers.get("x-salon-id");

    // Find user and include password (excluded by default via toJSON)
    const userQuery: Record<string, unknown> = { email: email.toLowerCase() };

    // Scope to salon when header is present (customer/staff/owner login)
    if (salonHeader) {
      userQuery.salonId = salonHeader;
      userQuery.role = { $in: ["customer", "staff", "owner"] };
    }
    // No header → only admin can log in (admin has salonId: null)
    else {
      userQuery.salonId = null;
      userQuery.role = "admin";
    }

    const user = await User.findOne(userQuery).select("+password");

    if (!user || !user.isActive) {
      return errorResponse("Invalid credentials", 401);
    }

    // Extra guard: ensure the user actually belongs to the requested salon
    if (salonHeader && user.salonId && String(user.salonId) !== salonHeader) {
      return errorResponse("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return errorResponse("Invalid credentials", 401);
    }

    const salon = user.salonId ? await Salon.findById(user.salonId) : null;

    const authPayload = {
      userId: String(user._id),
      salonId: user.salonId ? String(user.salonId) : null,
      role: user.role,
      email: user.email,
    };

    const token = signToken(authPayload);

    // Strip password before sending
    const userObj = user.toJSON();

    const response = successResponse(
      { token, user: userObj, salon },
      "Login successful"
    );

    if (user.role !== "admin") {
      setDashboardAuthCookies(response, authPayload);
    } else {
      clearDashboardAuthCookies(response);
    }

    return response;
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

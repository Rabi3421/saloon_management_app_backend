import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Salon from "@/models/Salon";
import { signToken } from "@/lib/jwt";
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

    // If the request comes from a specific salon frontend, scope login to that salon only
    const salonHeader = req.headers.get("X-Salon-ID");

    // Find user and include password (excluded by default via toJSON)
    const userQuery: Record<string, unknown> = { email: email.toLowerCase() };
    // Scope to salon if header is present (customer/staff login from a salon app)
    if (salonHeader) {
      userQuery.salonId = salonHeader;
      userQuery.role = { $in: ["customer", "staff"] };
    }

    const user = await User.findOne(userQuery).select("+password");

    if (!user || !user.isActive) {
      return errorResponse("Invalid credentials", 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return errorResponse("Invalid credentials", 401);
    }

    const salon = user.salonId ? await Salon.findById(user.salonId) : null;

    const token = signToken({
      userId: String(user._id),
      salonId: user.salonId ? String(user.salonId) : null,
      role: user.role,
      email: user.email,
    });

    // Strip password before sending
    const userObj = user.toJSON();

    return successResponse(
      { token, user: userObj, salon },
      "Login successful"
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

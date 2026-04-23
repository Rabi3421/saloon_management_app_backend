import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import PaymentMethod from "@/models/PaymentMethod";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse, validateRequiredFields } from "@/lib/apiHelpers";

/**
 * GET /api/user/payment-methods
 * Returns all saved payment methods for the logged-in user.
 */
export async function GET(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const methods = await PaymentMethod.find({ userId: auth.payload.userId }).sort({ isDefault: -1, createdAt: -1 });
    return successResponse(methods, "Payment methods fetched");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

/**
 * POST /api/user/payment-methods
 * Body: { cardholderName, last4, brand, expiryMonth, expiryYear, isDefault? }
 *
 * NOTE: In production, never store real card numbers.
 * Integrate with Stripe/Razorpay and store only the payment method token + last4.
 */
export async function POST(req: NextRequest) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const body = await req.json();

    const missing = validateRequiredFields(body, ["cardholderName", "last4", "brand", "expiryMonth", "expiryYear"]);
    if (missing) return errorResponse(missing, 422);

    if (body.last4.length !== 4 || !/^\d{4}$/.test(body.last4)) {
      return errorResponse("last4 must be exactly 4 digits", 422);
    }

    // If this is set as default, unset all other defaults
    if (body.isDefault) {
      await PaymentMethod.updateMany({ userId: auth.payload.userId }, { isDefault: false });
    }

    const method = await PaymentMethod.create({
      userId: auth.payload.userId,
      cardholderName: body.cardholderName,
      last4: body.last4,
      brand: body.brand,
      expiryMonth: body.expiryMonth,
      expiryYear: body.expiryYear,
      isDefault: body.isDefault || false,
    });

    return successResponse(method, "Payment method added", 201);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

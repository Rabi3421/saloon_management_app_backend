import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import PaymentMethod from "@/models/PaymentMethod";
import { authenticate, isAuthError } from "@/middleware/auth";
import { successResponse, errorResponse } from "@/lib/apiHelpers";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * DELETE /api/user/payment-methods/:id
 * Removes a saved payment method (only owner can delete their own).
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { id } = await params;

    const method = await PaymentMethod.findOneAndDelete({
      _id: id,
      userId: auth.payload.userId,
    });

    if (!method) return errorResponse("Payment method not found", 404);

    return successResponse(null, "Payment method removed");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

/**
 * PUT /api/user/payment-methods/:id
 * Set a card as the default payment method.
 */
export async function PUT(req: NextRequest, { params }: RouteContext) {
  const auth = authenticate(req);
  if (isAuthError(auth)) return auth;

  try {
    await connectDB();
    const { id } = await params;

    const method = await PaymentMethod.findOne({ _id: id, userId: auth.payload.userId });
    if (!method) return errorResponse("Payment method not found", 404);

    // Unset all others, set this one as default
    await PaymentMethod.updateMany({ userId: auth.payload.userId }, { isDefault: false });
    method.isDefault = true;
    await method.save();

    return successResponse(method, "Default payment method updated");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    return errorResponse(message, 500);
  }
}

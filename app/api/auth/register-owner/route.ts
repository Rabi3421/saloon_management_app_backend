import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/apiHelpers";

/**
 * Self-registration for salon owners is DISABLED.
 * Only a super-admin can create a salon + owner via POST /api/admin/salons.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_req: NextRequest) {
  return errorResponse(
    "Self-registration is not allowed. Contact your SalonOS administrator.",
    410
  );
}

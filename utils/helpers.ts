import mongoose from "mongoose";

/**
 * Validates that a string is a valid MongoDB ObjectId.
 */
export function isValidObjectId(id: string): boolean {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Safely parses a JSON body. Returns null on failure.
 */
export async function safeParseJSON(req: Request): Promise<Record<string, unknown> | null> {
  try {
    return await req.json();
  } catch {
    return null;
  }
}

/**
 * Strips undefined/null fields from an object before DB updates.
 */
export function sanitizeUpdateBody(
  body: Record<string, unknown>,
  allowedFields: string[]
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (body[key] !== undefined && body[key] !== null) {
      sanitized[key] = body[key];
    }
  }
  return sanitized;
}

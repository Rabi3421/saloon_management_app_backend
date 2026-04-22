import { NextResponse } from "next/server";

export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string>;
};

export function successResponse<T>(
  data: T,
  message = "Success",
  status = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({ success: true, message, data }, { status });
}

export function errorResponse(
  message: string,
  status = 400,
  errors?: Record<string, string>
): NextResponse<ApiResponse> {
  return NextResponse.json({ success: false, message, errors }, { status });
}

export function validateRequiredFields(
  body: Record<string, unknown>,
  fields: string[]
): string | null {
  for (const field of fields) {
    if (
      body[field] === undefined ||
      body[field] === null ||
      body[field] === ""
    ) {
      return `${field} is required`;
    }
  }
  return null;
}

import { NextRequest, NextResponse } from "next/server";
import { requireLocalRequest } from "./auth";

/**
 * Standard API error response format
 */
export type ApiError = {
  error: string;
  code?: string;
  details?: unknown;
};

/**
 * Standard API success response
 */
export type ApiSuccess<T> = {
  data: T;
};

/**
 * Creates a standardized error response
 */
export function errorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: unknown
): NextResponse<ApiError> {
  return NextResponse.json(
    { error: message, code, details },
    { status }
  );
}

/**
 * Creates a standardized success response
 */
export function successResponse<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

/**
 * Wraps an API handler with standard error handling and local auth check
 */
export function withErrorHandling<T>(
  handler: (request: NextRequest) => Promise<T>
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const authError = requireLocalRequest(request);
    if (authError) return authError;

    try {
      const result = await handler(request);
      if (result instanceof NextResponse) {
        return result;
      }
      return NextResponse.json(result);
    } catch (error) {
      console.error("API error:", error);
      
      if (error instanceof ApiException) {
        return errorResponse(error.message, error.status, error.code);
      }
      
      const message = error instanceof Error ? error.message : "Internal server error";
      return errorResponse(message, 500);
    }
  };
}

/**
 * Custom exception class for API errors with status codes
 */
export class ApiException extends Error {
  constructor(
    message: string,
    public status: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = "ApiException";
  }
}

/**
 * Parses JSON body with validation, throwing ApiException on failure
 */
export async function parseJsonBody<T>(request: NextRequest): Promise<T> {
  try {
    return await request.json() as T;
  } catch {
    throw new ApiException("Invalid JSON body", 400, "INVALID_JSON");
  }
}

/**
 * Validates that a value exists, throwing 404 if not
 */
export function requireValue<T>(
  value: T | null | undefined,
  message: string = "Not found"
): T {
  if (value === null || value === undefined) {
    throw new ApiException(message, 404, "NOT_FOUND");
  }
  return value;
}

/**
 * Validates that an ID has valid format
 */
export function validateId(id: string | undefined, name: string = "ID"): string {
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    throw new ApiException(`Invalid ${name} format`, 400, "INVALID_ID");
  }
  return id;
}

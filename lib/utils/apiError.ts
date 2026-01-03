/**
 * API Error Standardization Helper
 *
 * Provides consistent error handling for API routes without exposing
 * sensitive information like stack traces in production responses.
 *
 * @module lib/utils/apiError
 */
import { NextResponse } from "next/server";
import type { Response as ExpressResponse } from "express";

/**
 * Standard API error response structure
 */
export interface ApiErrorResponse {
  error: string;
}

/**
 * Options for API error handling
 */
export interface ApiErrorOptions {
  /**
   * HTTP status code (default: 500)
   */
  status?: number;
  /**
   * Whether to log the error to console (default: true)
   */
  log?: boolean;
  /**
   * Optional context prefix for logging (e.g., "[OverlaysAPI]")
   */
  context?: string;
}

/**
 * Safely extracts an error message from an unknown error type
 * for internal logging purposes only (never sent to client)
 *
 * @param error - The caught error of unknown type
 * @returns A string representation suitable for logging
 */
function formatErrorForLogging(error: unknown): string {
  if (error instanceof Error) {
    return error.stack || error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Creates a standardized API error response for Next.js API routes
 *
 * @param error - The caught error (any type)
 * @param genericMessage - User-facing error message (no sensitive details)
 * @param options - Optional configuration (status code, logging, context)
 * @returns NextResponse with standardized error JSON
 *
 * @example
 * ```typescript
 * // Basic usage
 * try {
 *   const data = await riskyOperation();
 *   return NextResponse.json({ data });
 * } catch (error) {
 *   return apiError(error, "Failed to process request");
 * }
 *
 * // With options
 * catch (error) {
 *   return apiError(error, "Invalid input", { status: 400, context: "[GuestsAPI]" });
 * }
 * ```
 */
export function apiError(
  error: unknown,
  genericMessage: string,
  options: ApiErrorOptions = {}
): NextResponse<ApiErrorResponse> {
  const { status = 500, log = true, context } = options;

  if (log) {
    const prefix = context ? `${context} ` : "";
    console.error(`${prefix}${genericMessage}:`, formatErrorForLogging(error));
  }

  return NextResponse.json({ error: genericMessage }, { status });
}

/**
 * Creates a standardized API error response for Express routes
 *
 * @param res - Express Response object
 * @param error - The caught error (any type)
 * @param genericMessage - User-facing error message (no sensitive details)
 * @param options - Optional configuration (status code, logging, context)
 *
 * @example
 * ```typescript
 * router.post("/endpoint", async (req, res) => {
 *   try {
 *     await doSomething();
 *     res.json({ success: true });
 *   } catch (error) {
 *     expressError(res, error, "Operation failed");
 *   }
 * });
 * ```
 */
export function expressError(
  res: ExpressResponse,
  error: unknown,
  genericMessage: string,
  options: ApiErrorOptions = {}
): void {
  const { status = 500, log = true, context } = options;

  if (log) {
    const prefix = context ? `${context} ` : "";
    console.error(`${prefix}${genericMessage}:`, formatErrorForLogging(error));
  }

  res.status(status).json({ error: genericMessage });
}

/**
 * Type guard to check if an error is a Zod validation error
 * Useful for returning 400 instead of 500 for validation failures
 *
 * @param error - The caught error
 * @returns True if the error is a ZodError
 */
export function isZodError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "ZodError"
  );
}

/**
 * Determines appropriate status code based on error type
 * - ZodError: 400 (Bad Request)
 * - Other errors: 500 (Internal Server Error)
 *
 * @param error - The caught error
 * @returns Appropriate HTTP status code
 */
export function getErrorStatusCode(error: unknown): number {
  if (isZodError(error)) {
    return 400;
  }
  return 500;
}

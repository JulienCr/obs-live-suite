/**
 * Zod Error Formatting Utilities
 *
 * Provides consistent formatting for Zod validation errors
 * across API routes.
 */
import { ZodError, ZodIssue } from "zod";

/**
 * Formatted field error for a single validation issue
 */
export interface FieldError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Standard validation error response structure
 */
export interface ValidationErrorResponse {
  error: string;
  details: FieldError[];
}

/**
 * Formats a Zod issue into a field error
 */
function formatIssue(issue: ZodIssue): FieldError {
  const field = issue.path.join(".");
  return {
    field: field || "(root)",
    message: issue.message,
    code: issue.code,
  };
}

/**
 * Formats a ZodError into a structured validation error response.
 *
 * @param error - ZodError from schema validation
 * @param genericMessage - Optional custom error message (default: "Validation failed")
 * @returns Structured error response suitable for API responses
 *
 * @example
 * ```typescript
 * try {
 *   const data = schema.parse(req.body);
 * } catch (error) {
 *   if (error instanceof ZodError) {
 *     return res.status(400).json(formatZodError(error));
 *   }
 *   throw error;
 * }
 * ```
 */
export function formatZodError(
  error: ZodError,
  genericMessage: string = "Validation failed"
): ValidationErrorResponse {
  return {
    error: genericMessage,
    details: error.issues.map(formatIssue),
  };
}

/**
 * Extracts a flat object of field names to error messages.
 * Useful for form validation display.
 *
 * @param error - ZodError from schema validation
 * @returns Object mapping field paths to error messages
 *
 * @example
 * ```typescript
 * const fieldErrors = getFieldErrors(zodError);
 * // { "email": "Invalid email format", "password": "Too short" }
 * ```
 */
export function getFieldErrors(error: ZodError): Record<string, string> {
  const result: Record<string, string> = {};

  for (const issue of error.issues) {
    const field = issue.path.join(".") || "(root)";
    // Only keep the first error for each field
    if (!result[field]) {
      result[field] = issue.message;
    }
  }

  return result;
}

/**
 * Gets a single human-readable error message from a ZodError.
 * Useful for simple error displays.
 *
 * @param error - ZodError from schema validation
 * @returns First error message or generic message if none
 */
export function getFirstZodErrorMessage(error: ZodError): string {
  const firstIssue = error.issues[0];
  if (!firstIssue) {
    return "Validation failed";
  }

  const field = firstIssue.path.join(".");
  if (field) {
    return `${field}: ${firstIssue.message}`;
  }

  return firstIssue.message;
}

/**
 * Type guard to check if an error is a ZodError.
 * Re-exported for convenience.
 */
export function isZodError(error: unknown): error is ZodError {
  return (
    error !== null &&
    typeof error === "object" &&
    "name" in error &&
    error.name === "ZodError"
  );
}

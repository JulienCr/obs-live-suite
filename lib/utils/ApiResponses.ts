/**
 * API Response Helpers
 *
 * Standardizes success and error responses across Next.js API routes.
 * Complements the existing apiError.ts for more granular response control.
 *
 * @module lib/utils/ApiResponses
 */
import { NextResponse } from "next/server";

/**
 * Standard API response helpers for consistent response formatting.
 *
 * @example
 * ```typescript
 * // Success responses
 * return ApiResponses.ok({ theme });
 * return ApiResponses.created({ guest });
 * return ApiResponses.noContent();
 *
 * // Error responses
 * return ApiResponses.badRequest("Invalid input");
 * return ApiResponses.notFound("Theme");
 * return ApiResponses.conflict("Profile name already exists");
 * ```
 */
export const ApiResponses = {
  // ============================================
  // Success Responses (2xx)
  // ============================================

  /**
   * 200 OK - Standard success response with data
   */
  ok: <T>(data: T) => NextResponse.json(data),

  /**
   * 201 Created - Resource successfully created
   */
  created: <T>(data: T) => NextResponse.json(data, { status: 201 }),

  /**
   * 204 No Content - Success with no response body
   */
  noContent: () => new NextResponse(null, { status: 204 }),

  // ============================================
  // Client Error Responses (4xx)
  // ============================================

  /**
   * 400 Bad Request - Invalid input or validation failure
   */
  badRequest: (message: string, details?: unknown) =>
    NextResponse.json(
      details ? { error: message, details } : { error: message },
      { status: 400 }
    ),

  /**
   * 401 Unauthorized - Authentication required
   */
  unauthorized: (message = "Unauthorized") =>
    NextResponse.json({ error: message }, { status: 401 }),

  /**
   * 403 Forbidden - Authenticated but not permitted
   */
  forbidden: (message = "Forbidden") =>
    NextResponse.json({ error: message }, { status: 403 }),

  /**
   * 404 Not Found - Resource does not exist
   */
  notFound: (entity: string) =>
    NextResponse.json({ error: `${entity} not found` }, { status: 404 }),

  /**
   * 409 Conflict - Resource state conflict (e.g., duplicate, in use)
   */
  conflict: (message: string) =>
    NextResponse.json({ error: message }, { status: 409 }),

  /**
   * 422 Unprocessable Entity - Semantic validation error
   */
  unprocessable: (message: string, details?: unknown) =>
    NextResponse.json(
      details ? { error: message, details } : { error: message },
      { status: 422 }
    ),

  // ============================================
  // Server Error Responses (5xx)
  // ============================================

  /**
   * 500 Internal Server Error - Unexpected server failure
   */
  serverError: (message = "Internal server error") =>
    NextResponse.json({ error: message }, { status: 500 }),

  /**
   * 503 Service Unavailable - Dependency unavailable
   */
  serviceUnavailable: (message = "Service unavailable") =>
    NextResponse.json({ error: message }, { status: 503 }),
} as const;

/**
 * Context type for route handlers with params
 */
export interface RouteContext<T = Record<string, string>> {
  params: Promise<T>;
}

/**
 * Check if an error is a known validation error that should return 400
 */
function isValidationError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("file too large") ||
    msg.includes("invalid file type") ||
    msg.includes("invalid") ||
    msg.includes("required") ||
    msg.includes("must be")
  );
}

/**
 * Higher-order function that wraps a route handler with automatic error handling.
 * Catches unhandled exceptions and returns a standardized 500 response.
 *
 * @param handler - The async route handler function
 * @param context - Optional logging context prefix (e.g., "[ThemesAPI]")
 * @returns Wrapped handler with error boundary
 *
 * @example
 * ```typescript
 * // Simple usage
 * export const GET = withErrorHandler(async (request) => {
 *   const data = await fetchData();
 *   return ApiResponses.ok({ data });
 * });
 *
 * // With route params
 * export const GET = withErrorHandler(
 *   async (request, context) => {
 *     const { id } = await context.params;
 *     const theme = await getTheme(id);
 *     if (!theme) return ApiResponses.notFound("Theme");
 *     return ApiResponses.ok({ theme });
 *   },
 *   "[ThemesAPI]"
 * );
 * ```
 */
export function withErrorHandler<T = Record<string, string>>(
  handler: (request: Request, context: RouteContext<T>) => Promise<Response>,
  logContext?: string
) {
  return async (
    request: Request,
    context: RouteContext<T>
  ): Promise<Response> => {
    try {
      return await handler(request, context);
    } catch (error) {
      const prefix = logContext ? `${logContext} ` : "";

      if (isValidationError(error)) {
        const message = error instanceof Error ? error.message : "Validation error";
        console.warn(`${prefix}Validation error:`, message);
        return ApiResponses.badRequest(message);
      }

      console.error(`${prefix}Unhandled API error:`, error);
      return ApiResponses.serverError();
    }
  };
}

/**
 * Simplified error handler for routes without params
 */
export function withSimpleErrorHandler(
  handler: (request: Request) => Promise<Response>,
  logContext?: string
) {
  return async (request: Request): Promise<Response> => {
    try {
      return await handler(request);
    } catch (error) {
      const prefix = logContext ? `${logContext} ` : "";

      if (isValidationError(error)) {
        const message = error instanceof Error ? error.message : "Validation error";
        console.warn(`${prefix}Validation error:`, message);
        return ApiResponses.badRequest(message);
      }

      console.error(`${prefix}Unhandled API error:`, error);
      return ApiResponses.serverError();
    }
  };
}

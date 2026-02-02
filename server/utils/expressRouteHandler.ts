/**
 * Express Route Handler Utilities
 *
 * Provides async handler wrappers with automatic error handling
 * to reduce boilerplate in Express route definitions.
 */
import { Request, Response, NextFunction, RequestHandler } from "express";
import { expressError, getErrorStatusCode } from "../../lib/utils/apiError";

/**
 * Options for the async handler wrapper
 */
export interface AsyncHandlerOptions {
  /**
   * Error message to show to users (no sensitive details)
   */
  errorMessage?: string;
  /**
   * Context prefix for logging (e.g., "[QuizAPI]")
   */
  context?: string;
}

/**
 * Creates an async Express route handler with automatic error handling.
 *
 * Wraps an async handler function and catches any thrown errors,
 * passing them to expressError with the configured message and context.
 *
 * @param handler - Async route handler function
 * @param options - Error handling options (errorMessage, context)
 * @returns Express RequestHandler with error handling
 *
 * @example
 * ```typescript
 * // Before: Manual try/catch in every route
 * router.post("/round/start", async (req, res) => {
 *   try {
 *     await manager.startRound(Number(req.body.roundIndex || 0));
 *     res.json({ success: true });
 *   } catch (error) {
 *     expressError(res, error, "Failed to start round", { context: "[QuizAPI]" });
 *   }
 * });
 *
 * // After: Clean handler with automatic error handling
 * router.post("/round/start", asyncHandler(async (req, res) => {
 *   await manager.startRound(Number(req.body.roundIndex || 0));
 *   res.json({ success: true });
 * }, { errorMessage: "Failed to start round", context: "[QuizAPI]" }));
 * ```
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
  options: AsyncHandlerOptions = {}
): RequestHandler {
  const { errorMessage = "Operation failed", context } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      // Use appropriate status code based on error type
      const status = getErrorStatusCode(error);
      expressError(res, error, errorMessage, { status, context });
    }
  };
}

/**
 * Creates an async handler with a specific context prefix.
 * Returns a factory function for creating handlers within that context.
 *
 * @param context - Context prefix for logging (e.g., "[QuizAPI]")
 * @returns Factory function for creating contextualized async handlers
 *
 * @example
 * ```typescript
 * const quizHandler = createContextHandler("[QuizAPI]");
 *
 * router.post("/round/start", quizHandler(async (req, res) => {
 *   await manager.startRound(Number(req.body.roundIndex || 0));
 *   res.json({ success: true });
 * }, "Failed to start round"));
 * ```
 */
export function createContextHandler(context: string) {
  return (
    handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
    errorMessage: string = "Operation failed"
  ): RequestHandler => {
    return asyncHandler(handler, { errorMessage, context });
  };
}

/**
 * Sync version of asyncHandler for non-async route handlers.
 * Catches synchronous errors and handles them consistently.
 *
 * @param handler - Sync route handler function
 * @param options - Error handling options
 * @returns Express RequestHandler with error handling
 */
export function syncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => unknown,
  options: AsyncHandlerOptions = {}
): RequestHandler {
  const { errorMessage = "Operation failed", context } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    try {
      handler(req, res, next);
    } catch (error) {
      const status = getErrorStatusCode(error);
      expressError(res, error, errorMessage, { status, context });
    }
  };
}

/**
 * Creates a sync handler with a specific context prefix.
 *
 * @param context - Context prefix for logging
 * @returns Factory function for creating contextualized sync handlers
 */
export function createSyncContextHandler(context: string) {
  return (
    handler: (req: Request, res: Response, next: NextFunction) => unknown,
    errorMessage: string = "Operation failed"
  ): RequestHandler => {
    return syncHandler(handler, { errorMessage, context });
  };
}

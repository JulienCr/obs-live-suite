/**
 * Query Parameter Parsing Utilities
 *
 * Provides standardized parsing for common query parameter patterns.
 *
 * @module lib/utils/queryParams
 */

/**
 * Parse a string query parameter to a boolean or undefined.
 *
 * @param value - The query parameter value (or null if not present)
 * @returns true if "true", false if "false", undefined otherwise
 *
 * @example
 * ```typescript
 * const enabled = parseBooleanQueryParam(searchParams.get("enabled"));
 * // "true" -> true
 * // "false" -> false
 * // null or any other value -> undefined
 * ```
 */
export function parseBooleanQueryParam(value: string | null): boolean | undefined {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return undefined;
}

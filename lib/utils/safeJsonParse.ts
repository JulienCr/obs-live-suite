/**
 * Safely parse JSON with a fallback value if parsing fails.
 *
 * This utility wraps JSON.parse in a try-catch to prevent runtime errors
 * from malformed JSON strings stored in the database or received from
 * external sources.
 *
 * @template T - The expected type of the parsed result
 * @param json - The JSON string to parse. Handles null/undefined gracefully.
 * @param fallback - The fallback value to return if parsing fails or input is nullish.
 * @returns The parsed value or the fallback if parsing fails.
 *
 * @example
 * // Basic usage with empty array fallback
 * const tags = safeJsonParse(row.tags, []);
 *
 * @example
 * // With object fallback
 * const settings = safeJsonParse(row.settings, { enabled: false });
 *
 * @example
 * // With typed result
 * interface Config { theme: string }
 * const config = safeJsonParse<Config>(jsonString, { theme: 'default' });
 */
export function safeJsonParse<T>(json: string | null | undefined, fallback: T): T {
  if (json === null || json === undefined || json === "") {
    return fallback;
  }

  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Safely parse JSON with an optional value (returns undefined on failure).
 *
 * Use this when the parsed value is truly optional and you want undefined
 * instead of a fallback when parsing fails.
 *
 * @template T - The expected type of the parsed result
 * @param json - The JSON string to parse. Handles null/undefined gracefully.
 * @returns The parsed value or undefined if parsing fails.
 *
 * @example
 * // Returns parsed object or undefined
 * const metadata = safeJsonParseOptional<Metadata>(row.metadata);
 */
export function safeJsonParseOptional<T>(json: string | null | undefined): T | undefined {
  if (json === null || json === undefined || json === "") {
    return undefined;
  }

  try {
    return JSON.parse(json) as T;
  } catch {
    return undefined;
  }
}

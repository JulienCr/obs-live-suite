/**
 * Timeout error thrown when a fetch request exceeds the specified timeout.
 */
export class TimeoutError extends Error {
  readonly timeout: number;

  constructor(timeout: number) {
    super(`Request timed out after ${timeout}ms`);
    this.name = "TimeoutError";
    this.timeout = timeout;
  }
}

/**
 * Extended RequestInit with optional timeout parameter.
 */
export interface FetchWithTimeoutOptions extends RequestInit {
  /**
   * Timeout in milliseconds. If the request takes longer than this,
   * a TimeoutError will be thrown.
   * @default 30000 (30 seconds)
   */
  timeout?: number;
}

/**
 * Fetch wrapper with built-in timeout support.
 *
 * Eliminates the need for manual AbortController/setTimeout patterns:
 * ```typescript
 * // Before (duplicate pattern)
 * const controller = new AbortController();
 * const timeout = setTimeout(() => controller.abort(), 5000);
 * try {
 *   const response = await fetch(url, { signal: controller.signal });
 *   clearTimeout(timeout);
 * } catch (error) {
 *   clearTimeout(timeout);
 *   if (error.name === "AbortError") throw new Error("Timeout");
 *   throw error;
 * }
 *
 * // After
 * const response = await fetchWithTimeout(url, { timeout: 5000 });
 * ```
 *
 * @param url - The URL to fetch
 * @param options - Standard fetch options plus optional timeout
 * @returns The fetch Response
 * @throws {TimeoutError} When the request exceeds the timeout
 * @throws {Error} For other fetch errors (network, etc.)
 */
export async function fetchWithTimeout(
  url: string | URL,
  options: FetchWithTimeoutOptions = {}
): Promise<Response> {
  const { timeout = 30000, signal: externalSignal, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Handle external signal if provided (allows caller to abort independently)
  const abortHandler = () => controller.abort();
  externalSignal?.addEventListener("abort", abortHandler);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      // Check if it was the external signal that aborted
      if (externalSignal?.aborted) {
        throw error; // Re-throw as regular AbortError
      }
      throw new TimeoutError(timeout);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortHandler);
  }
}

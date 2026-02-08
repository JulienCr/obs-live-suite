/**
 * Client-side Fetch Utility
 *
 * Provides standardized fetch wrappers for client-side API calls,
 * eliminating duplicated patterns across React components:
 * - Automatic JSON headers for POST/PUT/PATCH
 * - Consistent error handling with structured errors
 * - Response JSON parsing
 * - Optional timeout support
 * - TypeScript generics for type-safe responses
 *
 * @module lib/utils/ClientFetch
 */

import { fetchWithTimeout, TimeoutError } from "./fetchWithTimeout";

/**
 * Structured error class for client-side API errors.
 * Provides access to HTTP status, status text, and optional response data.
 */
export class ClientFetchError extends Error {
  /** HTTP status code (e.g., 404, 500) */
  readonly status: number;

  /** HTTP status text (e.g., "Not Found", "Internal Server Error") */
  readonly statusText: string;

  /** Parsed error response data, if available */
  readonly data?: unknown;

  /** The original URL that was requested */
  readonly url: string;

  constructor(
    message: string,
    status: number,
    statusText: string,
    url: string,
    data?: unknown
  ) {
    super(message);
    this.name = "ClientFetchError";
    this.status = status;
    this.statusText = statusText;
    this.url = url;
    this.data = data;
  }

  /**
   * Returns the error message from the response data if available,
   * otherwise returns the generic error message.
   */
  get errorMessage(): string {
    if (this.data && typeof this.data === "object" && "error" in this.data) {
      return String((this.data as { error: unknown }).error);
    }
    return this.message;
  }
}

/**
 * Options for client fetch operations.
 */
export interface ClientFetchOptions {
  /**
   * Request timeout in milliseconds.
   * @default 30000 (30 seconds)
   */
  timeout?: number;

  /**
   * Optional AbortSignal for request cancellation.
   */
  signal?: AbortSignal;

  /**
   * Additional headers to include in the request.
   */
  headers?: Record<string, string>;
}

/**
 * Parses the response body as JSON, handling empty responses gracefully.
 */
async function parseJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();

  if (!text || text.trim() === "") {
    return {} as T;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    // If parsing fails, return text wrapped in an object
    return { message: text } as T;
  }
}

/**
 * Handles non-OK responses by throwing a structured ClientFetchError.
 */
async function handleErrorResponse(
  response: Response,
  url: string
): Promise<never> {
  let data: unknown;

  try {
    data = await parseJsonResponse(response);
  } catch {
    // If we can't parse the error response, that's fine
    data = undefined;
  }

  // Extract error message from response data if available
  let message = `Request failed: ${response.status} ${response.statusText}`;
  if (data && typeof data === "object" && "error" in data) {
    message = String((data as { error: unknown }).error);
  }

  throw new ClientFetchError(
    message,
    response.status,
    response.statusText,
    url,
    data
  );
}

/**
 * Performs a GET request to the specified endpoint.
 *
 * @param endpoint - The API endpoint (e.g., "/api/settings/obs")
 * @param options - Optional fetch configuration
 * @returns Parsed JSON response
 * @throws {ClientFetchError} When the response status is not OK
 * @throws {TimeoutError} When the request exceeds the timeout
 *
 * @example
 * ```typescript
 * interface Settings { url: string; password: string; }
 *
 * const settings = await apiGet<Settings>("/api/settings/obs");
 * console.log(settings.url);
 * ```
 */
export async function apiGet<T>(
  endpoint: string,
  options: ClientFetchOptions = {}
): Promise<T> {
  const { timeout, signal, headers = {} } = options;

  const response = await fetchWithTimeout(endpoint, {
    method: "GET",
    headers,
    timeout,
    signal,
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint);
  }

  return parseJsonResponse<T>(response);
}

/**
 * Performs a POST request to the specified endpoint.
 *
 * @param endpoint - The API endpoint (e.g., "/api/actions/lower/show")
 * @param data - Optional data to send in the request body
 * @param options - Optional fetch configuration
 * @returns Parsed JSON response
 * @throws {ClientFetchError} When the response status is not OK
 * @throws {TimeoutError} When the request exceeds the timeout
 *
 * @example
 * ```typescript
 * interface ShowResponse { success: boolean; }
 *
 * const result = await apiPost<ShowResponse>("/api/actions/lower/show", {
 *   contentType: "guest",
 *   title: "John Doe",
 *   subtitle: "Developer"
 * });
 *
 * if (result.success) {
 *   console.log("Lower third shown!");
 * }
 * ```
 */
export async function apiPost<T>(
  endpoint: string,
  data?: unknown,
  options: ClientFetchOptions = {}
): Promise<T> {
  const { timeout, signal, headers = {} } = options;

  const response = await fetchWithTimeout(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
    timeout,
    signal,
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint);
  }

  return parseJsonResponse<T>(response);
}

/**
 * Performs a PUT request to the specified endpoint.
 *
 * @param endpoint - The API endpoint (e.g., "/api/themes/123")
 * @param data - Optional data to send in the request body
 * @param options - Optional fetch configuration
 * @returns Parsed JSON response
 * @throws {ClientFetchError} When the response status is not OK
 * @throws {TimeoutError} When the request exceeds the timeout
 *
 * @example
 * ```typescript
 * interface Theme { id: string; name: string; colors: ThemeColors; }
 *
 * const updated = await apiPut<Theme>("/api/themes/123", {
 *   name: "Dark Mode",
 *   colors: { primary: "#000", secondary: "#333" }
 * });
 * ```
 */
export async function apiPut<T>(
  endpoint: string,
  data?: unknown,
  options: ClientFetchOptions = {}
): Promise<T> {
  const { timeout, signal, headers = {} } = options;

  const response = await fetchWithTimeout(endpoint, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
    timeout,
    signal,
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint);
  }

  return parseJsonResponse<T>(response);
}

/**
 * Performs a PATCH request to the specified endpoint.
 *
 * @param endpoint - The API endpoint (e.g., "/api/guests/123")
 * @param data - Partial data to update
 * @param options - Optional fetch configuration
 * @returns Parsed JSON response
 * @throws {ClientFetchError} When the response status is not OK
 * @throws {TimeoutError} When the request exceeds the timeout
 *
 * @example
 * ```typescript
 * const updated = await apiPatch<Guest>("/api/guests/123", {
 *   displayName: "Jane Doe"
 * });
 * ```
 */
export async function apiPatch<T>(
  endpoint: string,
  data?: unknown,
  options: ClientFetchOptions = {}
): Promise<T> {
  const { timeout, signal, headers = {} } = options;

  const response = await fetchWithTimeout(endpoint, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: data !== undefined ? JSON.stringify(data) : undefined,
    timeout,
    signal,
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint);
  }

  return parseJsonResponse<T>(response);
}

/**
 * Performs a DELETE request to the specified endpoint.
 *
 * @param endpoint - The API endpoint (e.g., "/api/guests/123")
 * @param options - Optional fetch configuration
 * @returns Parsed JSON response
 * @throws {ClientFetchError} When the response status is not OK
 * @throws {TimeoutError} When the request exceeds the timeout
 *
 * @example
 * ```typescript
 * interface DeleteResponse { success: boolean; deleted: string; }
 *
 * const result = await apiDelete<DeleteResponse>("/api/guests/123");
 * console.log(`Deleted guest: ${result.deleted}`);
 * ```
 */
export async function apiDelete<T>(
  endpoint: string,
  options: ClientFetchOptions = {}
): Promise<T> {
  const { timeout, signal, headers = {} } = options;

  const response = await fetchWithTimeout(endpoint, {
    method: "DELETE",
    headers,
    timeout,
    signal,
  });

  if (!response.ok) {
    await handleErrorResponse(response, endpoint);
  }

  return parseJsonResponse<T>(response);
}

/**
 * Type guard to check if an error is a ClientFetchError.
 *
 * @param error - The error to check
 * @returns True if the error is a ClientFetchError
 *
 * @example
 * ```typescript
 * try {
 *   await apiGet("/api/resource");
 * } catch (error) {
 *   if (isClientFetchError(error)) {
 *     if (error.status === 404) {
 *       console.log("Resource not found");
 *     } else {
 *       console.error(`API Error (${error.status}): ${error.errorMessage}`);
 *     }
 *   } else if (error instanceof TimeoutError) {
 *     console.error("Request timed out");
 *   } else {
 *     throw error;
 *   }
 * }
 * ```
 */
export function isClientFetchError(error: unknown): error is ClientFetchError {
  return error instanceof ClientFetchError;
}

/**
 * Re-export TimeoutError for convenience.
 */
export { TimeoutError } from "./fetchWithTimeout";

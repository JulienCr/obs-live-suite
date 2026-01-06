import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config/urls";
import { ApiResponses } from "@/lib/utils/ApiResponses";

/**
 * HTTP methods supported by the proxy helper
 */
export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

/**
 * Options for proxy requests
 */
export interface ProxyOptions {
  /** HTTP method (defaults to GET) */
  method?: HttpMethod;
  /** Request body (will be JSON stringified) */
  body?: unknown;
  /** Custom error message for failures */
  errorMessage?: string;
  /** Log prefix for console output (e.g., "[Countdown Proxy]") */
  logPrefix?: string;
}

/**
 * Proxy a request to the backend Express server
 *
 * Handles the common pattern of forwarding requests from Next.js API routes
 * to the backend server, including error handling and response forwarding.
 *
 * @param endpoint - Backend API endpoint path (e.g., "/api/overlays/lower")
 * @param options - Proxy options including method, body, and error handling
 * @returns NextResponse with the backend response or error
 *
 * @example
 * // Simple GET request
 * export async function GET() {
 *   return proxyToBackend("/api/obs/status");
 * }
 *
 * @example
 * // POST with body
 * export async function POST(request: NextRequest) {
 *   const body = await request.json();
 *   return proxyToBackend("/api/overlays/lower", {
 *     method: "POST",
 *     body,
 *     errorMessage: "Failed to update lower third",
 *     logPrefix: "[Lower Third]",
 *   });
 * }
 *
 * @example
 * // DELETE request
 * export async function DELETE() {
 *   return proxyToBackend("/api/rooms/123", {
 *     method: "DELETE",
 *     errorMessage: "Failed to delete room",
 *   });
 * }
 */
export async function proxyToBackend(
  endpoint: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const {
    method = "GET",
    body,
    errorMessage = "Request failed",
    logPrefix,
  } = options;

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };

    const response = await fetch(`${BACKEND_URL}${endpoint}`, fetchOptions);

    // Handle non-JSON responses gracefully
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      if (!response.ok) {
        if (logPrefix) {
          console.error(`${logPrefix} Backend error:`, response.status, text);
        }
        return NextResponse.json(
          { error: text || errorMessage },
          { status: response.status }
        );
      }
      return NextResponse.json({ message: text }, { status: response.status });
    }

    const data = await response.json();

    if (!response.ok && logPrefix) {
      console.error(`${logPrefix} Backend error:`, response.status, data);
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    const errorDetails = error instanceof Error ? error.message : String(error);
    if (logPrefix) {
      console.error(`${logPrefix} Proxy error:`, error);
    } else {
      console.error(`[ProxyHelper] ${errorMessage}:`, error);
    }

    return ApiResponses.serviceUnavailable(`${errorMessage}: ${errorDetails}`);
  }
}

/**
 * Create a simple proxy handler for GET requests
 *
 * @param endpoint - Backend API endpoint path
 * @param errorMessage - Custom error message for failures
 * @param logPrefix - Optional log prefix for error messages
 * @returns Async function that returns NextResponse
 *
 * @example
 * export const GET = createGetProxy("/api/obs/status", "Failed to get OBS status", "[OBSAPI]");
 */
export function createGetProxy(
  endpoint: string,
  errorMessage?: string,
  logPrefix?: string
): () => Promise<NextResponse> {
  return () => proxyToBackend(endpoint, { method: "GET", errorMessage, logPrefix });
}

/**
 * Create a simple proxy handler for POST requests with JSON body
 *
 * @param endpoint - Backend API endpoint path
 * @param errorMessage - Custom error message for failures
 * @returns Async function that accepts body and returns NextResponse
 *
 * @example
 * const proxy = createPostProxy("/api/overlays/lower", "Failed to update overlay");
 * export async function POST(request: NextRequest) {
 *   const body = await request.json();
 *   return proxy(body);
 * }
 */
export function createPostProxy(
  endpoint: string,
  errorMessage?: string,
  logPrefix?: string
): (body: unknown) => Promise<NextResponse> {
  return (body: unknown) =>
    proxyToBackend(endpoint, { method: "POST", body, errorMessage, logPrefix });
}

/**
 * Send a request to the backend and return the raw fetch Response
 *
 * This is useful for routes that need to do additional processing after
 * the backend request, such as sending notifications or enriching data.
 *
 * @param endpoint - Backend API endpoint path
 * @param options - Proxy options including method, body, and error handling
 * @returns The raw fetch Response from the backend
 * @throws Error if the request fails
 *
 * @example
 * // POST with body and handle response manually
 * const response = await fetchFromBackend("/api/overlays/poster", {
 *   method: "POST",
 *   body: enrichedPayload,
 *   logPrefix: "[PosterAPI]",
 * });
 * if (!response.ok) {
 *   return ApiResponses.serverError("Backend request failed");
 * }
 * const data = await response.json();
 * // ... do additional processing ...
 * return ApiResponses.ok(data);
 */
export async function fetchFromBackend(
  endpoint: string,
  options: ProxyOptions = {}
): Promise<Response> {
  const {
    method = "GET",
    body,
    errorMessage = "Backend request failed",
    logPrefix,
  } = options;

  try {
    const fetchOptions: RequestInit = {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    };

    return await fetch(`${BACKEND_URL}${endpoint}`, fetchOptions);
  } catch (error) {
    if (logPrefix) {
      console.error(`${logPrefix} Backend fetch error:`, error);
    } else {
      console.error(`[ProxyHelper] ${errorMessage}:`, error);
    }
    throw error;
  }
}

/**
 * Parse a backend response and convert to NextResponse
 *
 * Useful for handling backend responses after fetchFromBackend
 * with proper error logging and status forwarding.
 *
 * @param response - The fetch Response from the backend
 * @param logPrefix - Optional log prefix for error messages
 * @returns NextResponse with the backend response data
 *
 * @example
 * const response = await fetchFromBackend("/api/overlays/poster", options);
 * if (!response.ok) {
 *   return parseBackendResponse(response, "[PosterAPI]");
 * }
 * // ... do additional processing ...
 * return ApiResponses.ok(data);
 */
export async function parseBackendResponse(
  response: Response,
  logPrefix?: string
): Promise<NextResponse> {
  const contentType = response.headers.get("content-type");

  if (!contentType?.includes("application/json")) {
    const text = await response.text();
    if (!response.ok && logPrefix) {
      console.error(`${logPrefix} Backend error:`, response.status, text);
    }
    return NextResponse.json(
      response.ok ? { message: text } : { error: text || "Backend request failed" },
      { status: response.status }
    );
  }

  const data = await response.json();

  if (!response.ok && logPrefix) {
    console.error(`${logPrefix} Backend error:`, response.status, data);
  }

  return NextResponse.json(data, { status: response.status });
}

/**
 * Centralized URL and port configuration
 *
 * These constants are the SINGLE SOURCE OF TRUTH for all ports and URLs.
 * Import from here instead of hardcoding values in individual files.
 */

// ============================================================================
// PORTS - Individual port numbers for dynamic URL construction
// ============================================================================

/** Frontend Next.js application port */
export const APP_PORT = process.env.APP_PORT || "3000";

/** Backend Express server port (HTTP API) */
export const BACKEND_PORT = process.env.BACKEND_PORT || "3002";

/** WebSocket hub port */
export const WS_PORT = process.env.WEBSOCKET_PORT || "3003";

// ============================================================================
// PROTOCOL - HTTP or HTTPS
// ============================================================================

/**
 * Auto-detect HTTPS from certificate files or USE_HTTPS env var.
 * Server-side: checks for mkcert certificate files in project root.
 * Client-side: detects from current page protocol.
 */
export const USE_HTTPS: boolean = (() => {
  // Explicit env var takes priority
  if (process.env.USE_HTTPS !== undefined) {
    return process.env.USE_HTTPS === "true";
  }

  // Server-side: auto-detect from certificate files (matches createServerWithFallback behavior)
  if (typeof window === "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("path");
      const certPath = path.join(process.cwd(), "localhost+4.pem");
      const keyPath = path.join(process.cwd(), "localhost+4-key.pem");
      return fs.existsSync(certPath) && fs.existsSync(keyPath);
    } catch {
      return false;
    }
  }

  // Client-side: detect from page protocol
  return typeof location !== "undefined" && location.protocol === "https:";
})();

/** HTTP protocol based on USE_HTTPS setting */
export const HTTP_PROTOCOL = USE_HTTPS ? "https" : "http";

/** WebSocket protocol based on USE_HTTPS setting */
export const WS_PROTOCOL = USE_HTTPS ? "wss" : "ws";

// ============================================================================
// FULL URLs - Complete URLs with protocol and host
// ============================================================================

/**
 * Backend Express server URL
 * Used by Next.js API routes to proxy requests to the backend
 */
export const BACKEND_URL = process.env.BACKEND_URL || `${HTTP_PROTOCOL}://localhost:${BACKEND_PORT}`;

/**
 * Frontend Next.js application URL
 * Used to convert relative URLs to absolute URLs
 */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || `${HTTP_PROTOCOL}://localhost:${APP_PORT}`;

/**
 * WebSocket hub URL (ws:// or wss:// protocol)
 * Used by clients to connect to the WebSocket server
 */
export const WS_URL = process.env.WS_URL || `${WS_PROTOCOL}://localhost:${WS_PORT}`;

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

  // Server-side: auto-detect from certificate files. This MUST stay in lock-step
  // with getHttpsServerOptions() in lib/config/tlsContext.mjs, which starts the
  // servers as HTTPS when EITHER the mkcert pair OR the Tailscale pair is present.
  // Checking only mkcert here would leave BACKEND_URL on http:// while the backend
  // listens on https://, so the frontend /api/* proxy would speak plaintext to a
  // TLS socket (Tailscale-only setups). Filenames mirror the *_PATH constants there.
  if (typeof window === "undefined") {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const fs = require("fs");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const path = require("path");
      const root = process.cwd();
      const hasPair = (cert: string, key: string) =>
        fs.existsSync(path.join(root, cert)) && fs.existsSync(path.join(root, key));
      return (
        hasPair("localhost+4.pem", "localhost+4-key.pem") ||
        hasPair("tailscale.crt", "tailscale.key")
      );
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
 * Internal loopback URL for server-to-server calls FROM the backend TO the
 * Next.js app (e.g. the Live Assist providers creating a poster / text preset).
 *
 * Deliberately NOT `APP_URL`:
 *  - Uses `127.0.0.1` (never `localhost`) to dodge Node 22's `localhost`→`::1`
 *    resolution, which yields ECONNREFUSED / "fetch failed" when the dev server
 *    listens on IPv4 only (mirrors the MCP server's config).
 *  - Ignores `NEXT_PUBLIC_APP_URL` (which may point at a public host like
 *    `https://edison:3000` that isn't a reliable loopback target).
 * TLS cert mismatch on the loopback is tolerated by `NODE_TLS_REJECT_UNAUTHORIZED=0`
 * in dev (set in `.env` / by `pnpm setup:https`).
 */
export const INTERNAL_APP_URL = process.env.INTERNAL_APP_URL || `${HTTP_PROTOCOL}://127.0.0.1:${APP_PORT}`;

/**
 * WebSocket hub URL (ws:// or wss:// protocol)
 * Used by clients to connect to the WebSocket server
 */
export const WS_URL = process.env.WS_URL || `${WS_PROTOCOL}://localhost:${WS_PORT}`;

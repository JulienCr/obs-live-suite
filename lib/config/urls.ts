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

/** Use HTTPS for frontend (set USE_HTTPS=true to enable) */
export const USE_HTTPS = process.env.USE_HTTPS === "true";

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

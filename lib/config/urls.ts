/**
 * Centralized URL configuration
 *
 * These constants are used throughout the application to reference
 * backend and frontend URLs. They should be imported instead of
 * being redefined in each file.
 */

/**
 * Backend Express server URL (port 3002)
 * Used by Next.js API routes to proxy requests to the backend
 */
export const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3002";

/**
 * Frontend Next.js application URL (port 3000)
 * Used to convert relative URLs to absolute URLs
 */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * WebSocket hub URL (port 3003)
 * Used by clients to connect to the WebSocket server
 */
export const WS_PORT = process.env.WEBSOCKET_PORT || "3003";

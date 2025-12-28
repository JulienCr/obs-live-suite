/**
 * WebSocket URL utilities
 */

/**
 * Get WebSocket URL for the WebSocket Hub
 * Automatically uses wss:// for HTTPS pages and ws:// for HTTP pages
 */
export function getWebSocketUrl(port: number = 3003): string {
  if (typeof window === "undefined") {
    // Server-side: default to ws://
    return `ws://localhost:${port}`;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:${port}`;
}

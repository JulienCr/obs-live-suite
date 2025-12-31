/**
 * Dynamic URL utilities for browser-side code
 *
 * These functions construct URLs dynamically based on the current window location,
 * allowing the app to work on different hosts (localhost, LAN IP, etc.) and protocols
 * (HTTP/HTTPS) without hardcoding.
 *
 * Ports are imported from the centralized config: @/lib/config/urls
 */

import { BACKEND_PORT, WS_PORT, APP_PORT } from "@/lib/config/urls";

/**
 * Get WebSocket URL for the WebSocket Hub
 * Automatically uses wss:// for HTTPS pages and ws:// for HTTP pages
 */
export function getWebSocketUrl(): string {
  if (typeof window === "undefined") {
    return `ws://localhost:${WS_PORT}`;
  }

  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.hostname}:${WS_PORT}`;
}

/**
 * Get backend HTTP URL
 * Automatically uses the current hostname to support LAN access
 */
export function getBackendUrl(): string {
  if (typeof window === "undefined") {
    return `http://localhost:${BACKEND_PORT}`;
  }

  return `${window.location.protocol}//${window.location.hostname}:${BACKEND_PORT}`;
}

/**
 * Get the frontend app URL based on current window location
 */
export function getAppUrl(): string {
  if (typeof window === "undefined") {
    return `http://localhost:${APP_PORT}`;
  }

  return `${window.location.protocol}//${window.location.hostname}:${APP_PORT}`;
}

/**
 * Build an API endpoint URL for the backend
 * @param path - API path (e.g., "/api/overlays/lower")
 */
export function getBackendApiUrl(path: string): string {
  const base = getBackendUrl();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

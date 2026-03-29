/**
 * Studio Return — Minimal bootstrapper
 *
 * This is the initial page loaded by Tauri's webview.
 * It waits for the Rust backend to send the Next.js overlay URL,
 * then navigates to it. The Next.js page handles all rendering.
 */

import "./styles.css";
import { initDebug, debugLog } from "./debug";

// ---- Init ----
initDebug();
debugLog("Bootstrapper loaded, waiting for overlay URL...");

// ---- Tauri bridge: receive overlay URL and navigate ----
(window as unknown as Record<string, unknown>).__setOverlayUrl = (url: string) => {
  debugLog(`Navigating to overlay: ${url}`);
  window.location.href = url;
};

// ---- Tauri bridge: settings (no-op in bootstrapper, exists for Rust eval safety) ----
(window as unknown as Record<string, unknown>).__applySettings = () => {};

// ---- Fallback: if no URL received within 10s, log warning ----
// The Rust backend is the source of truth for the overlay URL (sent via __setOverlayUrl).
// We no longer hardcode a fallback URL since the server may run on a different host.
setTimeout(() => {
  if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
    debugLog("Warning: no overlay URL received from Rust backend after 10s. Waiting...");
  }
}, 10000);

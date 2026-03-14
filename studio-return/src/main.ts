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

// ---- Fallback: if no URL received within 10s, try default ----
setTimeout(() => {
  if (window.location.pathname === "/" || window.location.pathname === "/index.html") {
    const fallbackUrl = "http://127.0.0.1:3000/overlays/studio-return";
    debugLog(`No overlay URL received, falling back to ${fallbackUrl}`);
    window.location.href = fallbackUrl;
  }
}, 10000);

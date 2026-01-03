import { proxyToBackend } from "@/lib/utils/ProxyHelper";

/**
 * POST /api/actions/lower/hide
 * Hide lower third (Stream Deck compatible, proxies to backend)
 */
export async function POST() {
  return proxyToBackend("/api/overlays/lower", {
    method: "POST",
    body: { action: "hide" },
    errorMessage: "Failed to hide lower third",
  });
}


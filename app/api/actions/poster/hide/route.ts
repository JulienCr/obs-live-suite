import { proxyToBackend } from "@/lib/utils/ProxyHelper";

const LOG_CONTEXT = "[ActionsAPI:Poster]";

/**
 * POST /api/actions/poster/hide
 * Hide poster (Stream Deck compatible)
 */
export async function POST() {
  return proxyToBackend("/api/overlays/poster", {
    method: "POST",
    body: { action: "hide" },
    errorMessage: "Failed to hide poster",
    logPrefix: LOG_CONTEXT,
  });
}


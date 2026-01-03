import { proxyToBackend } from "@/lib/utils/ProxyHelper";

const LOG_CONTEXT = "[ActionsAPI:Poster]";

/**
 * POST /api/actions/poster/previous
 * Show previous poster in rotation (Stream Deck compatible)
 */
export async function POST() {
  return proxyToBackend("/api/overlays/poster", {
    method: "POST",
    body: { action: "previous" },
    errorMessage: "Failed to show previous poster",
    logPrefix: LOG_CONTEXT,
  });
}


import { proxyToBackend } from "@/lib/utils/ProxyHelper";

const LOG_CONTEXT = "[ActionsAPI:Poster]";

/**
 * POST /api/actions/poster/next
 * Show next poster in rotation (Stream Deck compatible)
 */
export async function POST() {
  return proxyToBackend("/api/overlays/poster", {
    method: "POST",
    body: { action: "next" },
    errorMessage: "Failed to show next poster",
    logPrefix: LOG_CONTEXT,
  });
}


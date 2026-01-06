import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ActionsAPI:Poster:Previous]";

/**
 * POST /api/actions/poster/previous
 * Show previous poster in rotation (Stream Deck compatible)
 */
export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/overlays/poster", {
    method: "POST",
    body: { action: "previous" },
    errorMessage: "Failed to show previous poster",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);


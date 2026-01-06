import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ActionsAPI:Poster:Next]";

/**
 * POST /api/actions/poster/next
 * Show next poster in rotation (Stream Deck compatible)
 */
export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/overlays/poster", {
    method: "POST",
    body: { action: "next" },
    errorMessage: "Failed to show next poster",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);


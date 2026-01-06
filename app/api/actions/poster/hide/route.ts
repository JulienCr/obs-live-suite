import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ActionsAPI:Poster:Hide]";

/**
 * POST /api/actions/poster/hide
 * Hide poster (Stream Deck compatible)
 */
export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/overlays/poster", {
    method: "POST",
    body: { action: "hide" },
    errorMessage: "Failed to hide poster",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);


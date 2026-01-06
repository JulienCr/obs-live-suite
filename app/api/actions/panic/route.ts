import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ActionsAPI:Panic]";

/**
 * POST /api/actions/panic
 * Panic button - clears all overlays (Stream Deck compatible, proxies to backend)
 */
export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/overlays/clear-all", {
    method: "POST",
    body: {},
    errorMessage: "Failed to clear overlays",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

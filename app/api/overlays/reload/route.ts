import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[OverlaysAPI:Reload]";

/**
 * POST /api/overlays/reload
 * Force-reload all overlay browser sources (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/overlays/reload", {
    method: "POST",
    body: {},
    errorMessage: "Failed to reload overlays",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ActionsAPI:Lower:Hide]";

/**
 * POST /api/actions/lower/hide
 * Hide lower third (Stream Deck compatible, proxies to backend)
 */
export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/overlays/lower", {
    method: "POST",
    body: { action: "hide" },
    errorMessage: "Failed to hide lower third",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);


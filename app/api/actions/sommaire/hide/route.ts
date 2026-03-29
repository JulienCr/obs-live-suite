import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ActionsAPI:Sommaire:Hide]";

/**
 * POST /api/actions/sommaire/hide
 * Hide sommaire overlay (Stream Deck compatible)
 */
export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/overlays/sommaire", {
    method: "POST",
    body: { action: "hide" },
    errorMessage: "Failed to hide sommaire",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

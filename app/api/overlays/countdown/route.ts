import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[OverlaysAPI:Countdown]";

/**
 * POST /api/overlays/countdown
 * Control countdown timer (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  return proxyToBackend("/api/overlays/countdown", {
    method: "POST",
    body,
    errorMessage: "Failed to control countdown",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);


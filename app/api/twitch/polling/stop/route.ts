import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TwitchAPI:PollingStop]";

/**
 * POST /api/twitch/polling/stop
 * Stop polling for stream info (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/twitch/polling/stop", {
    method: "POST",
    errorMessage: "Failed to stop polling",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

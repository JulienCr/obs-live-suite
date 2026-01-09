import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TwitchAPI:PollingStart]";

/**
 * POST /api/twitch/polling/start
 * Start polling for stream info (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/twitch/polling/start", {
    method: "POST",
    errorMessage: "Failed to start polling",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

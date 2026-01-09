import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TwitchAPI:Refresh]";

/**
 * POST /api/twitch/refresh
 * Force refresh of stream info and provider selection (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/twitch/refresh", {
    method: "POST",
    errorMessage: "Failed to refresh stream info",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TwitchAPI:Status]";

/**
 * GET /api/twitch/status
 * Get current Twitch stream information (proxies to backend)
 */
export const GET = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/twitch/status", {
    method: "GET",
    errorMessage: "Failed to get Twitch status",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

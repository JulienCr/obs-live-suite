import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TwitchAPI:Provider]";

/**
 * GET /api/twitch/provider
 * Get current Twitch provider status (proxies to backend)
 */
export const GET = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/twitch/provider", {
    method: "GET",
    errorMessage: "Failed to get Twitch provider status",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

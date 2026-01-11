import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TwitchAPI:Moderation:Timeout]";

/**
 * POST /api/twitch/moderation/timeout
 * Timeout a user (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();

  return proxyToBackend("/api/twitch/moderation/timeout", {
    method: "POST",
    body,
    errorMessage: "Failed to timeout user",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

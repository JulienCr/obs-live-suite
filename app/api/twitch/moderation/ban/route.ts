import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TwitchAPI:Moderation:Ban]";

/**
 * POST /api/twitch/moderation/ban
 * Ban a user (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();

  return proxyToBackend("/api/twitch/moderation/ban", {
    method: "POST",
    body,
    errorMessage: "Failed to ban user",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

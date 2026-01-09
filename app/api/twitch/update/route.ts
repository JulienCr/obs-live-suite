import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TwitchAPI:Update]";

/**
 * POST /api/twitch/update
 * Update stream title and/or category (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();

  return proxyToBackend("/api/twitch/update", {
    method: "POST",
    body,
    errorMessage: "Failed to update stream info",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

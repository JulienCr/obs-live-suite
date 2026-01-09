import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TwitchAPI:AuthReload]";

/**
 * POST /api/twitch/auth/reload
 * Reload OAuth tokens from database (proxies to backend)
 * Call this to sync backend with tokens saved by Next.js OAuth callback
 */
export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/twitch/auth/reload", {
    method: "POST",
    errorMessage: "Failed to reload OAuth tokens",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

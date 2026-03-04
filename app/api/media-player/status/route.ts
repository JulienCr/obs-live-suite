import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[MediaPlayerAPI:Status]";

/**
 * GET /api/media-player/status
 * Get status of all media player drivers (proxies to backend)
 */
export const GET = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/media-player/status", {
    method: "GET",
    errorMessage: "Failed to get media player status",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[OBSAPI:Reconnect]";

/**
 * POST /api/obs/reconnect
 * Reconnect to OBS (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/obs/reconnect", {
    method: "POST",
    errorMessage: "Failed to reconnect to OBS",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

/**
 * GET /api/obs/reconnect
 * Reconnect to OBS (proxies to backend) - GET alias for POST
 */
export const GET = POST;


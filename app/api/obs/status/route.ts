import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[OBSAPI:Status]";

/**
 * GET /api/obs/status
 * Get current OBS status (proxies to backend)
 */
export const GET = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/obs/status", {
    method: "GET",
    errorMessage: "Failed to get OBS status",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);


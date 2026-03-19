import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[WordHarvestAPI:State]";

/**
 * GET /api/word-harvest/state
 * Get current word harvest state (proxies to backend)
 */
export const GET = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/word-harvest/state", {
    method: "GET",
    errorMessage: "Failed to fetch word harvest state",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

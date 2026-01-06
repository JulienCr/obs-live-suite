import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[QuizAPI:State]";

/**
 * GET /api/quiz/state
 * Get current quiz state (proxies to backend)
 */
export const GET = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/quiz/state", {
    method: "GET",
    errorMessage: "Failed to fetch quiz state",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);


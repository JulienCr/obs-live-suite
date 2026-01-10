import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[PresenterAPI:Cue:Clear]";

/**
 * DELETE /api/presenter/cue/clear
 * Clear all cue messages
 */
export const DELETE = withSimpleErrorHandler(
  async () => {
    return proxyToBackend("/api/cue/clear", {
      method: "DELETE",
      errorMessage: "Failed to clear messages",
      logPrefix: LOG_CONTEXT,
    });
  },
  LOG_CONTEXT
);

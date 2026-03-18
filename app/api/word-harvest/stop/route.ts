import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[WordHarvestAPI:Stop]";

export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/word-harvest/stop", {
    method: "POST",
    errorMessage: "Failed to stop word harvest",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

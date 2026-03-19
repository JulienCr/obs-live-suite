import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[WordHarvestAPI:Reset]";

export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/word-harvest/reset", {
    method: "POST",
    errorMessage: "Failed to reset word harvest",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

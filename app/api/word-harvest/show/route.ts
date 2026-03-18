import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[WordHarvestAPI:Show]";

export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/word-harvest/show", {
    method: "POST",
    errorMessage: "Failed to show word harvest overlay",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

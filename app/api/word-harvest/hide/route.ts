import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[WordHarvestAPI:Hide]";

export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/word-harvest/hide", {
    method: "POST",
    errorMessage: "Failed to hide word harvest overlay",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

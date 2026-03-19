import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[WordHarvestAPI:StartPerforming]";

export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/word-harvest/start-performing", {
    method: "POST",
    errorMessage: "Failed to start performing",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

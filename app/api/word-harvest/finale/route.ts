import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[WordHarvestAPI:Finale]";

export const POST = withSimpleErrorHandler(async () => {
  return proxyToBackend("/api/word-harvest/finale", {
    method: "POST",
    errorMessage: "Failed to trigger finale",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

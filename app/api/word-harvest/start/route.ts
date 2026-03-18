import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[WordHarvestAPI:Start]";

export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  return proxyToBackend("/api/word-harvest/start", {
    method: "POST",
    body,
    errorMessage: "Failed to start word harvest",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

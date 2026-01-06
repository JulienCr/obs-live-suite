import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[OBSAPI:Record]";

/**
 * POST /api/obs/record
 * Toggle recording (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  return proxyToBackend("/api/obs/record", {
    method: "POST",
    body,
    errorMessage: "Failed to control recording",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);


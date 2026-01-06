import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[OBSAPI:Stream]";

/**
 * POST /api/obs/stream
 * Toggle streaming (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  return proxyToBackend("/api/obs/stream", {
    method: "POST",
    body,
    errorMessage: "Failed to control stream",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);


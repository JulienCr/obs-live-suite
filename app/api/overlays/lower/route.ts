import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[OverlaysAPI:Lower]";

/**
 * POST /api/overlays/lower
 * Proxy to backend server for lower third overlay control
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  return proxyToBackend("/api/overlays/lower", {
    method: "POST",
    body,
    errorMessage: "Failed to update lower third",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);


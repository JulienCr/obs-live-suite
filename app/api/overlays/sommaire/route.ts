import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[OverlaysAPI:Sommaire]";

/**
 * POST /api/overlays/sommaire
 * Proxy to backend server for sommaire overlay control
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  return proxyToBackend("/api/overlays/sommaire", {
    method: "POST",
    body,
    errorMessage: "Failed to control sommaire",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

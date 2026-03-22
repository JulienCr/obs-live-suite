import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[OverlaysAPI:TitleReveal]";

/**
 * POST /api/overlays/title-reveal
 * Proxy to backend server for title reveal overlay control
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  return proxyToBackend("/api/overlays/title-reveal", {
    method: "POST",
    body,
    errorMessage: "Failed to control title reveal",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

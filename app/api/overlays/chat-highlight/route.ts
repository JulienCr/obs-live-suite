import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[OverlaysAPI:ChatHighlight]";

/**
 * POST /api/overlays/chat-highlight
 * Proxy to backend server for chat highlight overlay control
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  return proxyToBackend("/api/overlays/chat-highlight", {
    method: "POST",
    body,
    errorMessage: "Failed to control chat highlight",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

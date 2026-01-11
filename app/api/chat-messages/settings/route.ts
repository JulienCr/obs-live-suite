import { createGetProxy, proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ChatMessagesAPI:Settings]";

/**
 * GET /api/chat-messages/settings
 * Proxy to backend chat messages settings
 */
export const GET = createGetProxy("/api/chat-messages/settings", "Failed to fetch chat messages", LOG_CONTEXT);

/**
 * PUT /api/chat-messages/settings
 * Proxy to backend chat messages settings
 */
export const PUT = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  return proxyToBackend("/api/chat-messages/settings", {
    method: "PUT",
    body,
    errorMessage: "Failed to update chat messages",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

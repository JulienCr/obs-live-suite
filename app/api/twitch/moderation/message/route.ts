import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler, ApiResponses } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TwitchAPI:Moderation:Message]";

/**
 * DELETE /api/twitch/moderation/message?messageId=...
 * Delete a chat message (proxies to backend)
 */
export const DELETE = withSimpleErrorHandler(async (request: Request) => {
  const url = new URL(request.url);
  const messageId = url.searchParams.get("messageId");

  if (!messageId) {
    return ApiResponses.badRequest("messageId parameter is required");
  }

  return proxyToBackend(`/api/twitch/moderation/message?messageId=${encodeURIComponent(messageId)}`, {
    method: "DELETE",
    errorMessage: "Failed to delete message",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

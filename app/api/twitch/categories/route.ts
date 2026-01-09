import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler, ApiResponses } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TwitchAPI:Categories]";

/**
 * GET /api/twitch/categories?query=...
 * Search for game/category by name (proxies to backend)
 */
export const GET = withSimpleErrorHandler(async (request: Request) => {
  const url = new URL(request.url);
  const query = url.searchParams.get("query");

  if (!query) {
    return ApiResponses.badRequest("Query parameter is required");
  }

  return proxyToBackend(`/api/twitch/categories?query=${encodeURIComponent(query)}`, {
    method: "GET",
    errorMessage: "Failed to search categories",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

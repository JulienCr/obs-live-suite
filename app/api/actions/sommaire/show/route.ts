import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";
import { parseSommaireMarkdown } from "@/lib/models/Sommaire";

const LOG_CONTEXT = "[ActionsAPI:Sommaire:Show]";

/**
 * POST /api/actions/sommaire/show
 * Show sommaire overlay (Stream Deck compatible)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { markdown } = body;

  if (!markdown || typeof markdown !== "string") {
    return ApiResponses.badRequest("Markdown content required");
  }

  const categories = parseSommaireMarkdown(markdown);
  if (categories.length === 0) {
    return ApiResponses.badRequest("No categories found in markdown");
  }

  return proxyToBackend("/api/overlays/sommaire", {
    method: "POST",
    body: {
      action: "show",
      payload: { categories, activeIndex: -1 },
    },
    errorMessage: "Failed to show sommaire",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

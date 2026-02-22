import { enrichPosterPayload } from "@/lib/utils/themeEnrichment";
import { sendPosterShowNotification } from "@/lib/utils/posterShowNotification";
import { fetchFromBackend, parseBackendResponse } from "@/lib/utils/ProxyHelper";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[OverlaysAPI:Poster]";

/**
 * POST /api/overlays/poster
 * Control poster overlay (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { action, payload } = body;

  // Enrich poster payloads with theme data before proxying to backend
  let enrichedBody = body;
  if (action === 'show' && payload) {
    enrichedBody = {
      ...body,
      payload: enrichPosterPayload(payload),
    };
  }

  // Proxy to backend using standardized helper
  const response = await fetchFromBackend("/api/overlays/poster", {
    method: "POST",
    body: enrichedBody,
    errorMessage: "Failed to control poster",
    logPrefix: LOG_CONTEXT,
  });

  if (!response.ok) {
    return parseBackendResponse(response, LOG_CONTEXT);
  }

  const data = await response.json();

  // Send notification to presenter when showing a poster (non-blocking)
  if (action === 'show' && payload) {
    sendPosterShowNotification(payload, LOG_CONTEXT);
  }

  return ApiResponses.ok(data);
}, LOG_CONTEXT);

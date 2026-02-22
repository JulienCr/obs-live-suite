import { sendPosterShowNotification } from "@/lib/utils/posterShowNotification";
import { fetchFromBackend, parseBackendResponse } from "@/lib/utils/ProxyHelper";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[OverlaysAPI:PosterBigPicture]";

/**
 * POST /api/overlays/poster-bigpicture
 * Control big-picture poster overlay (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();

  // Proxy to backend using standardized helper (no theme enrichment needed for big-picture - always centered)
  const response = await fetchFromBackend("/api/overlays/poster-bigpicture", {
    method: "POST",
    body,
    errorMessage: "Failed to control big-picture poster",
    logPrefix: LOG_CONTEXT,
  });

  if (!response.ok) {
    return parseBackendResponse(response, LOG_CONTEXT);
  }

  const data = await response.json();

  // Send notification to presenter when showing a big picture poster (non-blocking)
  if (body.action === 'show' && body.payload) {
    sendPosterShowNotification(body.payload, LOG_CONTEXT);
  }

  return ApiResponses.ok(data);
}, LOG_CONTEXT);

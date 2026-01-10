import { createGetProxy, proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[PresenterAPI:Settings]";

/**
 * GET /api/presenter/settings
 * Proxy to backend presenter settings
 */
export const GET = createGetProxy("/api/presenter/settings", "Failed to fetch presenter settings", LOG_CONTEXT);

/**
 * PUT /api/presenter/settings
 * Proxy to backend presenter settings
 */
export const PUT = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  return proxyToBackend("/api/presenter/settings", {
    method: "PUT",
    body,
    errorMessage: "Failed to update presenter settings",
    logPrefix: LOG_CONTEXT,
  });
}, LOG_CONTEXT);

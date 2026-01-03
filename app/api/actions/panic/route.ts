import { proxyToBackend } from "@/lib/utils/ProxyHelper";

const LOG_CONTEXT = "[ActionsAPI:Panic]";

/**
 * POST /api/actions/panic
 * Panic button - clears all overlays (Stream Deck compatible, proxies to backend)
 */
export async function POST() {
  return proxyToBackend("/api/overlays/clear-all", {
    method: "POST",
    body: {},
    errorMessage: "Failed to clear overlays",
    logPrefix: LOG_CONTEXT,
  });
}

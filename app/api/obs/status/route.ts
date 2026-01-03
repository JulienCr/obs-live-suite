import { proxyToBackend } from "@/lib/utils/ProxyHelper";

const LOG_CONTEXT = "[OBSAPI]";

/**
 * GET /api/obs/status
 * Get current OBS status (proxies to backend)
 */
export async function GET() {
  return proxyToBackend("/api/obs/status", {
    method: "GET",
    errorMessage: "Failed to get OBS status",
    logPrefix: LOG_CONTEXT,
  });
}


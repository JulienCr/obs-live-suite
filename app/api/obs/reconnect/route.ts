import { proxyToBackend } from "@/lib/utils/ProxyHelper";

const LOG_CONTEXT = "[OBSAPI]";

/**
 * POST/GET /api/obs/reconnect
 * Reconnect to OBS (proxies to backend)
 */
export async function POST() {
  return proxyToBackend("/api/obs/reconnect", {
    method: "POST",
    errorMessage: "Failed to reconnect to OBS",
    logPrefix: LOG_CONTEXT,
  });
}

export async function GET() {
  return POST();
}


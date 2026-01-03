import { proxyToBackend } from "@/lib/utils/ProxyHelper";

/**
 * POST/GET /api/obs/reconnect
 * Reconnect to OBS (proxies to backend)
 */
export async function POST() {
  return proxyToBackend("/api/obs/reconnect", {
    method: "POST",
    errorMessage: "Failed to reconnect to OBS",
  });
}

export async function GET() {
  return POST();
}


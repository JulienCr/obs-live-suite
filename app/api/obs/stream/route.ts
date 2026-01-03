import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/utils/ProxyHelper";

const LOG_CONTEXT = "[OBSAPI]";

/**
 * POST /api/obs/stream
 * Toggle streaming (proxies to backend)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToBackend("/api/obs/stream", {
    method: "POST",
    body,
    errorMessage: "Failed to control stream",
    logPrefix: LOG_CONTEXT,
  });
}


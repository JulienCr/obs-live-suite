import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/utils/ProxyHelper";

const LOG_CONTEXT = "[OBSAPI]";

/**
 * POST /api/obs/record
 * Toggle recording (proxies to backend)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToBackend("/api/obs/record", {
    method: "POST",
    body,
    errorMessage: "Failed to control recording",
    logPrefix: LOG_CONTEXT,
  });
}


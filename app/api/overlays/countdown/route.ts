import { NextRequest } from "next/server";
import { proxyToBackend } from "@/lib/utils/ProxyHelper";

/**
 * POST /api/overlays/countdown
 * Control countdown timer (proxies to backend)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyToBackend("/api/overlays/countdown", {
    method: "POST",
    body,
    errorMessage: "Failed to control countdown",
    logPrefix: "[Countdown Proxy]",
  });
}


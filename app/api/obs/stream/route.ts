import { NextRequest } from "next/server";
import { createPostProxy } from "@/lib/utils/ProxyHelper";

const proxyPost = createPostProxy("/api/obs/stream", "Failed to control stream");

/**
 * POST /api/obs/stream
 * Toggle streaming (proxies to backend)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyPost(body);
}


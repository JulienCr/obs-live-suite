import { NextRequest } from "next/server";
import { createPostProxy } from "@/lib/utils/ProxyHelper";

const proxyPost = createPostProxy("/api/obs/record", "Failed to control recording");

/**
 * POST /api/obs/record
 * Toggle recording (proxies to backend)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyPost(body);
}


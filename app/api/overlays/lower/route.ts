import { NextRequest } from "next/server";
import { createPostProxy } from "@/lib/utils/ProxyHelper";

const proxyPost = createPostProxy("/api/overlays/lower", "Failed to update lower third");

/**
 * POST /api/overlays/lower
 * Proxy to backend server
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyPost(body);
}


import { NextRequest } from "next/server";
import { createPostProxy } from "@/lib/utils/ProxyHelper";

const proxyPost = createPostProxy("/api/overlays/chat-highlight", "Failed to control chat highlight");

/**
 * POST /api/overlays/chat-highlight
 * Proxy to backend server for chat highlight overlay control
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  return proxyPost(body);
}

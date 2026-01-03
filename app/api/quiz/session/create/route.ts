import { createPostProxy } from "@/lib/utils/ProxyHelper";

const proxyPost = createPostProxy("/api/quiz/session/create", "Failed to create session");

/**
 * POST /api/quiz/session/create
 * Create a new quiz session (proxies to backend)
 */
export async function POST(request: Request) {
  const body = await request.json();
  return proxyPost(body);
}


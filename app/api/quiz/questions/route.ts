import { createGetProxy, createPostProxy } from "@/lib/utils/ProxyHelper";

/**
 * GET /api/quiz/questions
 * List all quiz questions (proxies to backend)
 */
export const GET = createGetProxy("/api/quiz/questions", "Failed to fetch questions");

const proxyPost = createPostProxy("/api/quiz/questions", "Failed to create question");

/**
 * POST /api/quiz/questions
 * Create a new question (proxies to backend)
 */
export async function POST(request: Request) {
  const body = await request.json();
  return proxyPost(body);
}


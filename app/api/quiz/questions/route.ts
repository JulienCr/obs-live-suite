import { createGetProxy, createPostProxy } from "@/lib/utils/ProxyHelper";
import { withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[QuizQuestionsAPI]";

/**
 * GET /api/quiz/questions
 * List all quiz questions (proxies to backend)
 */
export const GET = createGetProxy(
  "/api/quiz/questions",
  "Failed to fetch questions"
);

const proxyPost = createPostProxy(
  "/api/quiz/questions",
  "Failed to create question"
);

/**
 * POST /api/quiz/questions
 * Create a new question (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  return proxyPost(body);
}, LOG_CONTEXT);


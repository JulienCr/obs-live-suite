import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { withErrorHandler, RouteContext } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[QuizAPI:Questions]";

/**
 * PUT /api/quiz/questions/[id]
 * Update a question (proxies to backend)
 */
export const PUT = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const body = await request.json();
    return proxyToBackend(`/api/quiz/questions/${id}`, {
      method: "PUT",
      body,
      errorMessage: "Failed to update question",
      logPrefix: LOG_CONTEXT,
    });
  },
  LOG_CONTEXT
);

/**
 * DELETE /api/quiz/questions/[id]
 * Delete a question (proxies to backend)
 */
export const DELETE = withErrorHandler<{ id: string }>(
  async (_request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    return proxyToBackend(`/api/quiz/questions/${id}`, {
      method: "DELETE",
      errorMessage: "Failed to delete question",
      logPrefix: LOG_CONTEXT,
    });
  },
  LOG_CONTEXT
);


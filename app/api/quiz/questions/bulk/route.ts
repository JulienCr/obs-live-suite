import { proxyToBackend } from "@/lib/utils/ProxyHelper";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[QuizQuestionsAPI]";

/**
 * POST /api/quiz/questions/bulk
 * Bulk import multiple quiz questions
 *
 * Body: { questions: Array<Partial<Question>> }
 * Returns: { imported: number, questions: Question[] }
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();

  if (!body.questions || !Array.isArray(body.questions)) {
    return ApiResponses.badRequest(
      "Invalid request: 'questions' array is required"
    );
  }

  if (body.questions.length === 0) {
    return ApiResponses.badRequest("No questions to import");
  }

  return proxyToBackend("/api/quiz/questions/bulk", {
    method: "POST",
    body,
    errorMessage: "Failed to import questions",
  });
}, LOG_CONTEXT);


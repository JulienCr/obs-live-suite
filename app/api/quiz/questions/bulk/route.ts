import { NextResponse } from "next/server";
import { proxyToBackend } from "@/lib/utils/ProxyHelper";

/**
 * POST /api/quiz/questions/bulk
 * Bulk import multiple quiz questions
 *
 * Body: { questions: Array<Partial<Question>> }
 * Returns: { imported: number, questions: Question[] }
 */
export async function POST(request: Request) {
  const body = await request.json();

  if (!body.questions || !Array.isArray(body.questions)) {
    return NextResponse.json(
      { error: "Invalid request: 'questions' array is required" },
      { status: 400 }
    );
  }

  if (body.questions.length === 0) {
    return NextResponse.json(
      { error: "No questions to import" },
      { status: 400 }
    );
  }

  return proxyToBackend("/api/quiz/questions/bulk", {
    method: "POST",
    body,
    errorMessage: "Failed to import questions",
  });
}


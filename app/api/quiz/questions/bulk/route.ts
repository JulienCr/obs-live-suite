import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config/urls";

/**
 * POST /api/quiz/questions/bulk
 * Bulk import multiple quiz questions
 * 
 * Body: { questions: Array<Partial<Question>> }
 * Returns: { imported: number, questions: Question[] }
 */
export async function POST(request: Request) {
  try {
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

    // Proxy to backend
    const response = await fetch(`${BACKEND_URL}/api/quiz/questions/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Quiz bulk import proxy error:", error);
    return NextResponse.json(
      { error: "Failed to import questions" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/**
 * GET /api/quiz/state
 * Get current quiz state (proxies to backend)
 */
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/quiz/state`);
    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Quiz state GET proxy error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz state" },
      { status: 500 }
    );
  }
}


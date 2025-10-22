import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/**
 * POST /api/quiz/session/create
 * Create a new quiz session (proxies to backend)
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/quiz/session/create`, {
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
    console.error("Quiz session create proxy error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}


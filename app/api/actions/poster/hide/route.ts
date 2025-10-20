import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/**
 * POST /api/actions/poster/hide
 * Hide poster (Stream Deck compatible)
 */
export async function POST() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/overlays/poster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'hide' }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Poster hide API error:", error);
    return NextResponse.json(
      { error: "Failed to hide poster" },
      { status: 500 }
    );
  }
}


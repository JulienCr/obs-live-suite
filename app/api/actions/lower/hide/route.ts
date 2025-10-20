import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/**
 * POST /api/actions/lower/hide
 * Hide lower third (Stream Deck compatible, proxies to backend)
 */
export async function POST() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/overlays/lower`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'hide' }),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Lower hide API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to hide lower third" },
      { status: 500 }
    );
  }
}


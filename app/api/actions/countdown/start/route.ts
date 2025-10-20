import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/**
 * POST /api/actions/countdown/start
 * Start countdown (Stream Deck compatible, proxies to backend)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { seconds } = body;

    if (!seconds || seconds <= 0) {
      return NextResponse.json(
        { error: "Valid seconds value required" },
        { status: 400 }
      );
    }

    // Set the countdown time
    await fetch(`${BACKEND_URL}/api/overlays/countdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', payload: { seconds } }),
    });
    
    // Start it
    await fetch(`${BACKEND_URL}/api/overlays/countdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Countdown start API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to start countdown" },
      { status: 500 }
    );
  }
}


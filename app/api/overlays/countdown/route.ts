import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/**
 * POST /api/overlays/countdown
 * Control countdown timer (proxies to backend)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[Countdown Proxy] Forwarding request:", body.action);
    
    const response = await fetch(`${BACKEND_URL}/api/overlays/countdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("[Countdown Proxy] Backend error:", response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Countdown API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to control countdown" },
      { status: 500 }
    );
  }
}


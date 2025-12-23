import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/**
 * POST /api/overlays/poster-bigpicture
 * Control big-picture poster overlay (proxies to backend)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Proxy to backend (no theme enrichment needed for big-picture - always centered)
    const response = await fetch(`${BACKEND_URL}/api/overlays/poster-bigpicture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Next.js BigPicture Poster API] Backend error:", data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("BigPicture Poster API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to control big-picture poster" },
      { status: 500 }
    );
  }
}

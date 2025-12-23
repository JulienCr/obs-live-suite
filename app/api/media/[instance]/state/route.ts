import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/**
 * GET /api/media/:instance/state
 * Get media playlist state (proxies to backend)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ instance: string }> }
) {
  try {
    const { instance } = await params;
    console.log(`[Media Proxy] Getting state for instance ${instance}`);

    const response = await fetch(`${BACKEND_URL}/api/media/${instance}/state`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Media Proxy] Backend error:`, response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Media state API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to get media state" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/**
 * POST /api/media/:instance/next
 * Move to next media item (proxies to backend)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instance: string }> }
) {
  try {
    const { instance } = await params;
    console.log(`[Media Proxy] Moving to next item in instance ${instance}`);

    const response = await fetch(`${BACKEND_URL}/api/media/${instance}/next`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Media Proxy] Backend error:`, response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Media next API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to move to next media item" },
      { status: 500 }
    );
  }
}

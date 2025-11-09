import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/**
 * POST /api/media/:instance/items
 * Add media item to playlist (proxies to backend)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instance: string }> }
) {
  try {
    const { instance } = await params;
    const body = await request.json();
    console.log(`[Media Proxy] Adding item to instance ${instance}:`, body.url);

    const response = await fetch(`${BACKEND_URL}/api/media/${instance}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`[Media Proxy] Backend error:`, response.status, data);
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Media add item API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to add media item" },
      { status: 500 }
    );
  }
}

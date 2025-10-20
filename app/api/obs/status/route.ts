import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3002';

/**
 * GET /api/obs/status
 * Get current OBS status (proxies to backend)
 */
export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/obs/status`);
    const data = await response.json();
    
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("OBS status API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to get OBS status" },
      { status: 500 }
    );
  }
}


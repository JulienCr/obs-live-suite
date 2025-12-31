import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config/urls";

/**
 * POST /api/obs/record
 * Toggle recording (proxies to backend)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/obs/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("OBS record API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to control recording" },
      { status: 500 }
    );
  }
}


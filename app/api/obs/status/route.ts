import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config/urls";

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


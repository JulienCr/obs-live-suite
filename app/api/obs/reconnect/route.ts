import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config/urls";

/**
 * POST/GET /api/obs/reconnect
 * Reconnect to OBS (proxies to backend)
 */
export async function POST() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/obs/reconnect`, {
      method: 'POST',
    });
    
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      details: String(error)
    }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}


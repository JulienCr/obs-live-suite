import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config/urls";

/**
 * POST /api/actions/panic
 * Panic button - clears all overlays (Stream Deck compatible, proxies to backend)
 */
export async function POST() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/overlays/clear-all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Panic button API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to clear overlays" },
      { status: 500 }
    );
  }
}

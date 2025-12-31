import { NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config/urls";

/**
 * POST /api/actions/poster/next
 * Show next poster in rotation (Stream Deck compatible)
 */
export async function POST() {
  try {
    const response = await fetch(`${BACKEND_URL}/api/overlays/poster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'next' }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Poster next API error:", error);
    return NextResponse.json(
      { error: "Failed to show next poster" },
      { status: 500 }
    );
  }
}


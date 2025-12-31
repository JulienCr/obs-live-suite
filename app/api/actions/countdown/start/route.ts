import { NextRequest, NextResponse } from "next/server";
import { BACKEND_URL } from "@/lib/config/urls";

/**
 * POST /api/actions/countdown/start
 * Start countdown (Stream Deck compatible, proxies to backend)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { seconds, style, format, position, size, theme } = body;

    if (!seconds || seconds <= 0) {
      return NextResponse.json(
        { error: "Valid seconds value required" },
        { status: 400 }
      );
    }

    // Prepare the payload with all customization options
    const payload = {
      seconds,
      ...(style && { style }),
      ...(format && { format }),
      ...(position && { position }),
      ...(size && { size }),
      ...(theme && { theme }),
    };

    // Set the countdown time with customization
    await fetch(`${BACKEND_URL}/api/overlays/countdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set', payload }),
    });
    
    // Start it
    await fetch(`${BACKEND_URL}/api/overlays/countdown`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'start' }),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Countdown start API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to start countdown" },
      { status: 500 }
    );
  }
}


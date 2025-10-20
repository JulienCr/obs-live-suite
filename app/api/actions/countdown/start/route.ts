import { NextRequest, NextResponse } from "next/server";
import { ChannelManager } from "@/lib/services/ChannelManager";
import { CountdownEventType } from "@/lib/models/OverlayEvents";

/**
 * POST /api/actions/countdown/start
 * Start countdown (Stream Deck compatible)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { seconds } = body;

    if (!seconds || seconds <= 0) {
      return NextResponse.json(
        { error: "Valid seconds value required" },
        { status: 400 }
      );
    }

    const channelManager = ChannelManager.getInstance();
    
    // Set the countdown time
    await channelManager.publishCountdown(CountdownEventType.SET, { seconds });
    
    // Start it
    await channelManager.publishCountdown(CountdownEventType.START);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Countdown start API error:", error);
    return NextResponse.json(
      { error: "Failed to start countdown" },
      { status: 500 }
    );
  }
}


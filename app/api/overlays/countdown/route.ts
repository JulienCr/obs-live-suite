import { NextRequest, NextResponse } from "next/server";
import { ChannelManager } from "@/lib/services/ChannelManager";
import { CountdownEventType } from "@/lib/models/OverlayEvents";

/**
 * POST /api/overlays/countdown
 * Control countdown timer
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    const channelManager = ChannelManager.getInstance();

    switch (action) {
      case "set":
        await channelManager.publishCountdown(CountdownEventType.SET, payload);
        break;

      case "start":
        await channelManager.publishCountdown(CountdownEventType.START);
        break;

      case "pause":
        await channelManager.publishCountdown(CountdownEventType.PAUSE);
        break;

      case "reset":
        await channelManager.publishCountdown(CountdownEventType.RESET);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Countdown API error:", error);
    return NextResponse.json(
      { error: "Failed to control countdown" },
      { status: 500 }
    );
  }
}


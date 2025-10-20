import { NextResponse } from "next/server";
import { ChannelManager } from "@/lib/services/ChannelManager";
import { LowerThirdEventType } from "@/lib/models/OverlayEvents";

/**
 * POST /api/actions/lower/hide
 * Hide lower third (Stream Deck compatible)
 */
export async function POST() {
  try {
    const channelManager = ChannelManager.getInstance();
    await channelManager.publishLowerThird(LowerThirdEventType.HIDE);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lower hide API error:", error);
    return NextResponse.json(
      { error: "Failed to hide lower third" },
      { status: 500 }
    );
  }
}


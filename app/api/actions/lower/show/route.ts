import { NextRequest, NextResponse } from "next/server";
import { ChannelManager } from "@/lib/services/ChannelManager";
import { LowerThirdEventType } from "@/lib/models/OverlayEvents";

/**
 * POST /api/actions/lower/show
 * Show lower third (Stream Deck compatible)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, subtitle, side = "left", duration } = body;

    const channelManager = ChannelManager.getInstance();
    
    await channelManager.publishLowerThird(LowerThirdEventType.SHOW, {
      title,
      subtitle,
      side,
      themeId: "default", // TODO: Get from active profile
      duration,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lower show API error:", error);
    return NextResponse.json(
      { error: "Failed to show lower third" },
      { status: 500 }
    );
  }
}


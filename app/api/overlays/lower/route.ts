import { NextRequest, NextResponse } from "next/server";
import { ChannelManager } from "@/lib/services/ChannelManager";
import { LowerThirdEventType } from "@/lib/models/OverlayEvents";
import { lowerThirdShowPayloadSchema } from "@/lib/models/OverlayEvents";

/**
 * POST /api/overlays/lower
 * Control lower third overlay
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    const channelManager = ChannelManager.getInstance();

    switch (action) {
      case "show":
        const validated = lowerThirdShowPayloadSchema.parse(payload);
        await channelManager.publishLowerThird(LowerThirdEventType.SHOW, validated);
        break;

      case "hide":
        await channelManager.publishLowerThird(LowerThirdEventType.HIDE);
        break;

      case "update":
        await channelManager.publishLowerThird(LowerThirdEventType.UPDATE, payload);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lower third API error:", error);
    return NextResponse.json(
      { error: "Failed to control lower third" },
      { status: 500 }
    );
  }
}


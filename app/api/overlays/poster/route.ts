import { NextRequest, NextResponse } from "next/server";
import { ChannelManager } from "@/lib/services/ChannelManager";
import { PosterEventType } from "@/lib/models/OverlayEvents";

/**
 * POST /api/overlays/poster
 * Control poster overlay
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    const channelManager = ChannelManager.getInstance();

    switch (action) {
      case "show":
        await channelManager.publishPoster(PosterEventType.SHOW, payload);
        break;

      case "hide":
        await channelManager.publishPoster(PosterEventType.HIDE);
        break;

      case "next":
        await channelManager.publishPoster(PosterEventType.NEXT);
        break;

      case "previous":
        await channelManager.publishPoster(PosterEventType.PREVIOUS);
        break;

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Poster API error:", error);
    return NextResponse.json(
      { error: "Failed to control poster" },
      { status: 500 }
    );
  }
}


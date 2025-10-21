import { NextRequest, NextResponse } from "next/server";
import { LowerThirdEventType, OverlayChannel } from "@/lib/models/OverlayEvents";
import { BackendClient } from "@/lib/utils/BackendClient";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { enrichLowerThirdPayload } from "@/lib/utils/themeEnrichment";

/**
 * POST /api/actions/lower/show
 * Show lower third (Stream Deck compatible)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, subtitle, side = "left", duration, accentColor, avatarUrl } = body;

    // Build base payload and enrich with theme data using shared utility
    const db = DatabaseService.getInstance();
    const basePayload = {
      title,
      subtitle,
      side,
      duration,
      accentColor,
      avatarUrl,
    };

    const enrichedPayload = enrichLowerThirdPayload(basePayload, db);
    console.log("[LowerShow] Publishing with theme:", !!enrichedPayload.theme);

    await BackendClient.publish(OverlayChannel.LOWER, LowerThirdEventType.SHOW, enrichedPayload);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Lower show API error:", error);
    return NextResponse.json(
      { error: "Failed to show lower third" },
      { status: 500 }
    );
  }
}


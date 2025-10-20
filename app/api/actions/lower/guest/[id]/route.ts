import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { BackendClient } from "@/lib/utils/BackendClient";
import { LowerThirdEventType, OverlayChannel } from "@/lib/models/OverlayEvents";

/**
 * POST /api/actions/lower/guest/[id]
 * Show a guest's lower third by ID (Stream Deck compatible)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = DatabaseService.getInstance();
    const guest = db.getGuestById(id) as any;

    if (!guest) {
      return NextResponse.json(
        { error: `Guest with ID ${id} not found` },
        { status: 404 }
      );
    }

    // Optional: override duration from request body
    const body = await request.json().catch(() => ({}));
    const duration = body.duration || 8;

    await BackendClient.publish(OverlayChannel.LOWER, LowerThirdEventType.SHOW, {
      title: guest.displayName,
      subtitle: guest.subtitle || "",
      side: "left",
      themeId: "default",
      duration,
    });

    return NextResponse.json({ 
      success: true, 
      guest: {
        id: guest.id,
        displayName: guest.displayName,
        subtitle: guest.subtitle
      }
    });
  } catch (error) {
    console.error("Guest lower third API error:", error);
    return NextResponse.json(
      { error: "Failed to show guest lower third" },
      { status: 500 }
    );
  }
}


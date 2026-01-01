import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { SettingsService } from "@/lib/services/SettingsService";
import { BackendClient } from "@/lib/utils/BackendClient";
import { LowerThirdEventType, OverlayChannel } from "@/lib/models/OverlayEvents";
import { enrichLowerThirdPayload } from "@/lib/utils/themeEnrichment";
import { DbGuest } from "@/lib/models/Database";
import { sendPresenterNotification } from "@/lib/utils/presenterNotifications";

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
    const guest = db.getGuestById(id);

    if (!guest) {
      return NextResponse.json(
        { error: `Guest with ID ${id} not found` },
        { status: 404 }
      );
    }

    // Optional: override duration from request body, fallback to settings
    const body = await request.json().catch(() => ({}));
    const settingsService = SettingsService.getInstance();
    const overlaySettings = settingsService.getOverlaySettings();
    const duration = body.duration || overlaySettings.lowerThirdDuration;

    // Build base payload and enrich with theme data using shared utility
    const basePayload = {
      contentType: "guest" as const, // Important: Mark as guest type for tracking
      title: guest.displayName,
      subtitle: guest.subtitle || "",
      side: "left" as const,
      duration,
      avatarUrl: guest.avatarUrl,
      accentColor: guest.accentColor,
      guestId: guest.id, // Add guest ID for tracking in dashboard
    };

    const enrichedPayload = enrichLowerThirdPayload(basePayload, db);
    console.log("[GuestAction] Publishing with theme:", !!enrichedPayload.theme);

    await BackendClient.publish(OverlayChannel.LOWER, LowerThirdEventType.SHOW, enrichedPayload);

    // Send notification to presenter (non-blocking)
    try {
      await sendPresenterNotification({
        type: "guest",
        title: `Guest: ${guest.displayName}`,
        imageUrl: guest.avatarUrl || undefined,
        bullets: guest.subtitle ? [guest.subtitle] : undefined,
        guestId: guest.id, // Include guest ID for tracking
      });
    } catch (error) {
      console.error("[GuestAction] Failed to send presenter notification:", error);
    }

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


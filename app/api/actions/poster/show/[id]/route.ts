import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { SettingsService } from "@/lib/services/SettingsService";
import { enrichPosterPayload } from "@/lib/utils/themeEnrichment";
import { DbPoster } from "@/lib/models/Database";
import { BACKEND_URL } from "@/lib/config/urls";

/**
 * POST /api/actions/poster/show/[id]
 * Show a poster by ID (Stream Deck compatible)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = DatabaseService.getInstance();
    const poster = db.getPosterById(id);

    if (!poster) {
      return NextResponse.json(
        { error: `Poster with ID ${id} not found` },
        { status: 404 }
      );
    }

    // Build base payload and enrich with theme data
    const basePayload = {
      posterId: id,
      fileUrl: poster.fileUrl,
      type: poster.type as "image" | "video" | "youtube",
      transition: 'fade' as const,
    };

    const enrichedPayload = enrichPosterPayload(basePayload, db);
    console.log("[PosterAction] Publishing with theme:", !!enrichedPayload.theme);

    const response = await fetch(`${BACKEND_URL}/api/overlays/poster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'show',
        payload: enrichedPayload,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    // Send chat message if enabled and defined (non-blocking)
    const settingsService = SettingsService.getInstance();
    const chatSettings = settingsService.getChatMessageSettings();

    if (chatSettings.posterChatMessageEnabled && poster.chatMessage) {
      fetch(`${BACKEND_URL}/api/streamerbot-chat/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: 'twitch',
          message: poster.chatMessage,
        }),
      }).catch((error) => {
        console.error("[PosterAction] Failed to send chat message:", error);
      });
    }

    return NextResponse.json({
      success: true,
      poster: {
        id: poster.id,
        title: poster.title,
        fileUrl: poster.fileUrl
      }
    });
  } catch (error) {
    console.error("Poster show API error:", error);
    return NextResponse.json(
      { error: "Failed to show poster" },
      { status: 500 }
    );
  }
}


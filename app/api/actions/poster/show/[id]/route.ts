import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { SettingsService } from "@/lib/services/SettingsService";
import { enrichPosterPayload } from "@/lib/utils/themeEnrichment";
import { BACKEND_URL } from "@/lib/config/urls";
import { sendChatMessageIfEnabled } from "@/lib/utils/chatMessaging";
import { ApiResponses, withErrorHandler, RouteContext } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ActionsAPI:Poster]";

/**
 * POST /api/actions/poster/show/[id]
 * Show a poster by ID (Stream Deck compatible)
 */
export const POST = withErrorHandler<{ id: string }>(
  async (_request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const db = DatabaseService.getInstance();
    const poster = db.getPosterById(id);

    if (!poster) {
      return ApiResponses.notFound(`Poster with ID ${id}`);
    }

    // Build base payload and enrich with theme data
    const basePayload = {
      posterId: id,
      fileUrl: poster.fileUrl,
      type: poster.type as "image" | "video" | "youtube",
      transition: 'fade' as const,
    };

    const enrichedPayload = enrichPosterPayload(basePayload, db);
    console.log(`${LOG_CONTEXT} Publishing with theme:`, !!enrichedPayload.theme);

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
    sendChatMessageIfEnabled({ enabled: chatSettings.posterChatMessageEnabled }, poster.chatMessage);

    return ApiResponses.ok({
      success: true,
      poster: {
        id: poster.id,
        title: poster.title,
        fileUrl: poster.fileUrl
      }
    });
  },
  LOG_CONTEXT
);


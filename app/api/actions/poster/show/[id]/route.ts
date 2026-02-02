import { PosterRepository } from "@/lib/repositories/PosterRepository";
import { SettingsService } from "@/lib/services/SettingsService";
import { enrichPosterPayload } from "@/lib/utils/themeEnrichment";
import { sendChatMessageIfEnabled } from "@/lib/utils/chatMessaging";
import { fetchFromBackend, parseBackendResponse } from "@/lib/utils/ProxyHelper";
import { ApiResponses, withErrorHandler, RouteContext } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ActionsAPI:Poster:Show]";

/**
 * POST /api/actions/poster/show/[id]
 * Show a poster by ID (Stream Deck compatible)
 */
export const POST = withErrorHandler<{ id: string }>(
  async (_request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const posterRepo = PosterRepository.getInstance();
    const poster = posterRepo.getById(id);

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

    const enrichedPayload = enrichPosterPayload(basePayload);
    console.log(`${LOG_CONTEXT} Publishing with theme:`, !!enrichedPayload.theme);

    // Proxy to backend using standardized helper
    const response = await fetchFromBackend("/api/overlays/poster", {
      method: "POST",
      body: {
        action: 'show',
        payload: enrichedPayload,
      },
      errorMessage: "Failed to show poster",
      logPrefix: LOG_CONTEXT,
    });

    if (!response.ok) {
      return parseBackendResponse(response, LOG_CONTEXT);
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


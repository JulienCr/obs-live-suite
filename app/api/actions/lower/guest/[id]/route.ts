import { DatabaseService } from "@/lib/services/DatabaseService";
import { SettingsService } from "@/lib/services/SettingsService";
import { BackendClient } from "@/lib/utils/BackendClient";
import { LowerThirdEventType, OverlayChannel } from "@/lib/models/OverlayEvents";
import { enrichLowerThirdPayload } from "@/lib/utils/themeEnrichment";
import { sendPresenterNotification } from "@/lib/utils/presenterNotifications";
import { sendChatMessageIfEnabled } from "@/lib/utils/chatMessaging";
import { ApiResponses, withErrorHandler, RouteContext } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ActionsAPI:Lower:Guest]";

/**
 * POST /api/actions/lower/guest/[id]
 * Show a guest's lower third by ID (Stream Deck compatible)
 */
export const POST = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const db = DatabaseService.getInstance();
    const guest = db.getGuestById(id);

    if (!guest) {
      return ApiResponses.notFound(`Guest with ID ${id}`);
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
    console.log(`${LOG_CONTEXT} Publishing with theme:`, !!enrichedPayload.theme);

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
      console.error(`${LOG_CONTEXT} Failed to send presenter notification:`, error);
    }

    // Send chat message if enabled and defined (non-blocking)
    const chatSettings = settingsService.getChatMessageSettings();
    sendChatMessageIfEnabled({ enabled: chatSettings.guestChatMessageEnabled }, guest.chatMessage);

    return ApiResponses.ok({
      success: true,
      guest: {
        id: guest.id,
        displayName: guest.displayName,
        subtitle: guest.subtitle
      }
    });
  },
  LOG_CONTEXT
);


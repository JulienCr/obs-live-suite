import { TextPresetRepository } from "@/lib/repositories/TextPresetRepository";
import { SettingsService } from "@/lib/services/SettingsService";
import { BackendClient } from "@/lib/utils/BackendClient";
import { LowerThirdEventType, OverlayChannel } from "@/lib/models/OverlayEvents";
import { enrichLowerThirdPayload } from "@/lib/utils/themeEnrichment";
import { sendPresenterNotification } from "@/lib/utils/presenterNotifications";
import { ApiResponses, withErrorHandler, RouteContext } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ActionsAPI:Lower:TextPreset]";

/**
 * POST /api/actions/lower/text-preset/[id]
 * Show a text preset's lower third by ID (Stream Deck compatible)
 */
export const POST = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const repo = TextPresetRepository.getInstance();
    const preset = repo.getById(id);

    if (!preset) {
      return ApiResponses.notFound(`Text preset with ID ${id}`);
    }

    const body = await request.json().catch(() => ({}));
    const settingsService = SettingsService.getInstance();
    const overlaySettings = settingsService.getOverlaySettings();
    const duration = body.duration || overlaySettings.lowerThirdDuration;

    const basePayload = {
      contentType: "text" as const,
      body: preset.body,
      side: preset.side,
      imageUrl: preset.imageUrl,
      imageAlt: preset.imageAlt,
      duration,
      textPresetId: preset.id,
    };

    const enrichedPayload = enrichLowerThirdPayload(basePayload);
    await BackendClient.publish(OverlayChannel.LOWER, LowerThirdEventType.SHOW, enrichedPayload);

    try {
      await sendPresenterNotification({
        type: "lower-third",
        title: `Text: ${preset.name}`,
        body: preset.body,
        imageUrl: preset.imageUrl || undefined,
      });
    } catch (error) {
      console.error(`${LOG_CONTEXT} Failed to send presenter notification:`, error);
    }

    return ApiResponses.ok({
      success: true,
      textPreset: {
        id: preset.id,
        name: preset.name,
      },
    });
  },
  LOG_CONTEXT
);

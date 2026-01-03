import { SettingsService } from "@/lib/services/SettingsService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[SettingsAPI:overlay]";

/**
 * GET /api/settings/overlay
 * Get overlay settings (timeouts, auto-hide)
 */
export const GET = withSimpleErrorHandler(async () => {
  const settingsService = SettingsService.getInstance();
  const settings = settingsService.getOverlaySettings();

  return ApiResponses.ok({ settings });
}, LOG_CONTEXT);

/**
 * POST /api/settings/overlay
 * Save overlay settings
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { lowerThirdDuration, chatHighlightDuration, chatHighlightAutoHide } = body;

  // Validate durations (1-60 seconds)
  if (lowerThirdDuration !== undefined) {
    if (typeof lowerThirdDuration !== "number" || lowerThirdDuration < 1 || lowerThirdDuration > 60) {
      return ApiResponses.badRequest("lowerThirdDuration must be a number between 1 and 60");
    }
  }

  if (chatHighlightDuration !== undefined) {
    if (typeof chatHighlightDuration !== "number" || chatHighlightDuration < 1 || chatHighlightDuration > 60) {
      return ApiResponses.badRequest("chatHighlightDuration must be a number between 1 and 60");
    }
  }

  if (chatHighlightAutoHide !== undefined && typeof chatHighlightAutoHide !== "boolean") {
    return ApiResponses.badRequest("chatHighlightAutoHide must be a boolean");
  }

  const settingsService = SettingsService.getInstance();
  settingsService.saveOverlaySettings({
    lowerThirdDuration,
    chatHighlightDuration,
    chatHighlightAutoHide,
  });

  return ApiResponses.ok({
    success: true,
    message: "Overlay settings saved successfully",
  });
}, LOG_CONTEXT);

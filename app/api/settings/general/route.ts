import { SettingsService } from "@/lib/services/SettingsService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[GeneralSettingsAPI]";

/**
 * GET /api/settings/general
 * Get general UI settings
 */
export const GET = withSimpleErrorHandler(async () => {
  const settingsService = SettingsService.getInstance();
  const settings = settingsService.getGeneralSettings();
  const chatMessageSettings = settingsService.getChatMessageSettings();

  return ApiResponses.ok({
    settings: {
      ...settings,
      ...chatMessageSettings,
    }
  });
}, LOG_CONTEXT);

/**
 * POST /api/settings/general
 * Save general UI settings
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { defaultPosterDisplayMode, posterChatMessageEnabled, guestChatMessageEnabled } = body;

  const settingsService = SettingsService.getInstance();

  // Validate display mode if provided
  const validModes = ["left", "right", "bigpicture"];
  if (defaultPosterDisplayMode && !validModes.includes(defaultPosterDisplayMode)) {
    return ApiResponses.badRequest("Invalid display mode. Must be 'left', 'right', or 'bigpicture'");
  }

  // Save general settings
  if (defaultPosterDisplayMode) {
    settingsService.saveGeneralSettings({ defaultPosterDisplayMode });
  }

  // Save chat message settings
  if (posterChatMessageEnabled !== undefined || guestChatMessageEnabled !== undefined) {
    settingsService.saveChatMessageSettings({
      posterChatMessageEnabled,
      guestChatMessageEnabled,
    });
  }

  return ApiResponses.ok({
    success: true,
    message: "Settings saved successfully",
  });
}, LOG_CONTEXT);

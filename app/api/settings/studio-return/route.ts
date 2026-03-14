import { SettingsService } from "@/lib/services/SettingsService";
import { AppConfig } from "@/lib/config/AppConfig";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[StudioReturnSettingsAPI]";

/**
 * GET /api/settings/studio-return
 * Get Studio Return overlay settings + WebSocket port for the Tauri app
 */
export const GET = withSimpleErrorHandler(async () => {
  const settingsService = SettingsService.getInstance();
  const settings = settingsService.getStudioReturnSettings();
  const wsPort = AppConfig.getInstance().websocketPort;

  return ApiResponses.ok({ settings, wsPort });
}, LOG_CONTEXT);

/**
 * POST /api/settings/studio-return
 * Save Studio Return overlay settings
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { monitorIndex, displayDuration, fontSize, enabled } = body;

  const settingsService = SettingsService.getInstance();

  settingsService.saveStudioReturnSettings({
    ...(monitorIndex !== undefined && { monitorIndex }),
    ...(displayDuration !== undefined && { displayDuration }),
    ...(fontSize !== undefined && { fontSize }),
    ...(enabled !== undefined && { enabled }),
  });

  return ApiResponses.ok({
    success: true,
    message: "Studio Return settings saved successfully",
  });
}, LOG_CONTEXT);

import { SettingsService } from "@/lib/services/SettingsService";
import { AppConfig } from "@/lib/config/AppConfig";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";
import { StudioReturnSettingsSchema } from "@/lib/models/StudioReturn";
import { proxyToBackend } from "@/lib/utils/ProxyHelper";

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
  const input = StudioReturnSettingsSchema.partial().parse(body);

  const settingsService = SettingsService.getInstance();
  const updatedSettings = settingsService.saveStudioReturnSettings(input);

  // Push updated settings to the studio return app via WebSocket (presenter channel)
  try {
    await proxyToBackend("/api/overlays/studio-return-settings", {
      method: "POST",
      body: updatedSettings,
      logPrefix: LOG_CONTEXT,
    });
  } catch (err) {
    console.warn(
      `${LOG_CONTEXT} Failed to push settings to studio return overlay (will be picked up on next poll):`,
      err,
    );
  }

  return ApiResponses.ok({
    success: true,
    message: "Studio Return settings saved successfully",
  });
}, LOG_CONTEXT);

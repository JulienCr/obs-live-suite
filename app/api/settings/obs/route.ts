import { SettingsService } from "@/lib/services/SettingsService";
import { OBSConnectionManager } from "@/lib/adapters/obs/OBSConnectionManager";
import { OBSStateManager } from "@/lib/adapters/obs/OBSStateManager";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[OBSSettingsAPI]";

/**
 * GET /api/settings/obs
 * Get current OBS settings
 */
export const GET = withSimpleErrorHandler(async () => {
  const settingsService = SettingsService.getInstance();
  const settings = settingsService.getOBSSettings();

  // Return full settings including password
  // (UI settings page needs to show current values)
  const response = {
    url: settings.url,
    password: settings.password || "",
    hasPassword: !!settings.password,
    sourceIsDatabase: settingsService.hasOBSSettingsInDatabase(),
  };

  return ApiResponses.ok(response);
}, LOG_CONTEXT);

/**
 * POST /api/settings/obs
 * Save OBS settings and test connection
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { url, password, testOnly } = body;

  if (!url) {
    return ApiResponses.badRequest("URL is required");
  }

  const connectionManager = OBSConnectionManager.getInstance();

  // Test connection first
  try {
    await connectionManager.connectWithCredentials(url, password || undefined);

    // Get OBS version for confirmation
    const version = await connectionManager.getOBS().call("GetVersion");

    // If not test-only, save settings
    if (!testOnly) {
      const settingsService = SettingsService.getInstance();
      settingsService.saveOBSSettings({ url, password: password || undefined });

      // Refresh OBS state after successful connection
      const stateManager = OBSStateManager.getInstance();
      await stateManager.refreshState();
    }

    return ApiResponses.ok({
      success: true,
      message: "Connection successful",
      obsVersion: version.obsVersion,
      obsWebSocketVersion: version.obsWebSocketVersion,
      saved: !testOnly,
    });
  } catch (error) {
    return ApiResponses.badRequest(
      error instanceof Error ? error.message : "Connection failed"
    );
  }
}, LOG_CONTEXT);

/**
 * DELETE /api/settings/obs
 * Clear OBS settings from database (fallback to .env)
 */
export const DELETE = withSimpleErrorHandler(async () => {
  const settingsService = SettingsService.getInstance();
  settingsService.clearOBSSettings();

  // Reconnect with environment variables
  const connectionManager = OBSConnectionManager.getInstance();
  await connectionManager.disconnect();
  await connectionManager.connect();

  return ApiResponses.ok({
    success: true,
    message: "Settings cleared, using environment variables",
  });
}, LOG_CONTEXT);


import { SettingsService } from "@/lib/services/SettingsService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[SettingsAPI:TitleRevealDefaults]";

/**
 * GET /api/settings/title-reveal-defaults
 * Get title reveal default settings
 */
export const GET = withSimpleErrorHandler(async () => {
  const settingsService = SettingsService.getInstance();
  const settings = settingsService.getTitleRevealDefaults();
  return ApiResponses.ok({ settings });
}, LOG_CONTEXT);

/**
 * POST /api/settings/title-reveal-defaults
 * Save title reveal default settings
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const settingsService = SettingsService.getInstance();
  settingsService.saveTitleRevealDefaults(body);
  return ApiResponses.ok({
    success: true,
    message: "Title reveal defaults saved",
  });
}, LOG_CONTEXT);

import { SettingsService } from "@/lib/services/SettingsService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[SettingsAPI:WordHarvestMidi]";

/**
 * GET /api/settings/word-harvest-midi
 * Get word harvest MIDI settings
 */
export const GET = withSimpleErrorHandler(async () => {
  const settingsService = SettingsService.getInstance();
  const settings = settingsService.getWordHarvestMidiSettings();
  return ApiResponses.ok({ settings });
}, LOG_CONTEXT);

/**
 * POST /api/settings/word-harvest-midi
 * Save word harvest MIDI settings
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const settingsService = SettingsService.getInstance();
  settingsService.saveWordHarvestMidiSettings(body);
  return ApiResponses.ok({
    success: true,
    message: "Word harvest MIDI settings saved",
  });
}, LOG_CONTEXT);

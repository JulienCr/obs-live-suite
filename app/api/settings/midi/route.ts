import { SettingsService } from "@/lib/services/SettingsService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";
import { midiSettingsSchema } from "@/lib/models/Midi";

const LOG_CONTEXT = "[SettingsAPI:Midi]";

/**
 * GET /api/settings/midi
 * Get centralized MIDI settings (apps + actions → messages)
 */
export const GET = withSimpleErrorHandler(async () => {
  const settingsService = SettingsService.getInstance();
  const settings = settingsService.getMidiSettings();
  return ApiResponses.ok({ settings });
}, LOG_CONTEXT);

/**
 * POST /api/settings/midi
 * Save centralized MIDI settings
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  // Validate + apply defaults before persisting
  const settings = midiSettingsSchema.parse(body);
  const settingsService = SettingsService.getInstance();
  settingsService.saveMidiSettings(settings);
  return ApiResponses.ok({ success: true, message: "MIDI settings saved" });
}, LOG_CONTEXT);

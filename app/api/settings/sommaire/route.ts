import { SettingsRepository } from "@/lib/repositories/SettingsRepository";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[SettingsAPI:Sommaire]";
const SETTING_KEY = "sommaire.markdown";

/**
 * GET /api/settings/sommaire
 * Get saved sommaire markdown
 */
export const GET = withSimpleErrorHandler(async () => {
  const repo = SettingsRepository.getInstance();
  const markdown = repo.getSetting(SETTING_KEY) ?? "";
  return ApiResponses.ok({ markdown });
}, LOG_CONTEXT);

/**
 * POST /api/settings/sommaire
 * Save sommaire markdown
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { markdown } = body;

  if (typeof markdown !== "string") {
    return ApiResponses.badRequest("markdown must be a string");
  }

  const repo = SettingsRepository.getInstance();
  if (markdown.trim()) {
    repo.setSetting(SETTING_KEY, markdown);
  } else {
    repo.deleteSetting(SETTING_KEY);
  }

  return ApiResponses.ok({ success: true });
}, LOG_CONTEXT);

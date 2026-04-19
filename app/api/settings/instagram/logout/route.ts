import { rm } from "fs/promises";
import { SettingsService } from "@/lib/services/SettingsService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[InstagramLogout]";

/**
 * POST /api/settings/instagram/logout
 * Delete the instaloader session file and clear the username.
 */
export const POST = withSimpleErrorHandler(async () => {
  const settingsService = SettingsService.getInstance();
  const sessionPath = settingsService.getInstagramSessionPath();

  if (sessionPath) {
    await rm(sessionPath, { force: true }).catch(() => {});
  }

  // Clear cookie file
  const cookiePath = settingsService.getInstagramCookieFilePath();
  if (cookiePath) {
    await rm(cookiePath, { force: true }).catch(() => {});
  }

  settingsService.saveInstagramUsername("");
  settingsService.saveInstagramSessionId("");

  return ApiResponses.ok({
    success: true,
    message: "Session Instagram supprimée.",
  });
}, LOG_CONTEXT);

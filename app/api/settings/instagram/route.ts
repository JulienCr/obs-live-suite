import { SettingsService } from "@/lib/services/SettingsService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[InstagramSettings]";

/**
 * GET /api/settings/instagram
 * Returns Instagram settings and session status.
 */
export const GET = withSimpleErrorHandler(async () => {
  const settingsService = SettingsService.getInstance();
  const username = settingsService.getInstagramUsername();
  const sessionId = settingsService.getInstagramSessionId();

  return ApiResponses.ok({
    username,
    hasSession: settingsService.isInstagramSessionValid(),
    hasSessionId: !!sessionId,
    sessionIdMasked: sessionId ? "••••••••" + sessionId.slice(-6) : "",
  });
}, LOG_CONTEXT);

/**
 * POST /api/settings/instagram
 * Save Instagram settings (username and/or sessionId).
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { username, sessionId } = body;
  const settingsService = SettingsService.getInstance();

  if (typeof username === "string") {
    const clean = username.replace(/^@/, "").trim();
    if (clean && !/^[a-zA-Z0-9._]+$/.test(clean)) {
      return ApiResponses.badRequest("Invalid Instagram username format");
    }
    settingsService.saveInstagramUsername(clean);
  }

  if (typeof sessionId === "string") {
    settingsService.saveInstagramSessionId(sessionId.trim());
  }

  return ApiResponses.ok({
    username: settingsService.getInstagramUsername(),
    hasSession: settingsService.isInstagramSessionValid(),
    hasSessionId: !!settingsService.getInstagramSessionId(),
  });
}, LOG_CONTEXT);

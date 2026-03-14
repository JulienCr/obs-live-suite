import { SettingsService } from "@/lib/services/SettingsService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[StudioReturnMonitorsAPI]";

/**
 * GET /api/settings/studio-return/monitors
 * Returns the list of monitors reported by the Tauri app
 */
export const GET = withSimpleErrorHandler(async () => {
  const monitors = SettingsService.getInstance().getStudioReturnMonitors();
  return ApiResponses.ok({ monitors });
}, LOG_CONTEXT);

/**
 * POST /api/settings/studio-return/monitors
 * Receives the monitor list from the Tauri app
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { monitors } = body;

  if (!Array.isArray(monitors)) {
    return ApiResponses.badRequest("monitors must be an array");
  }

  SettingsService.getInstance().saveStudioReturnMonitors(monitors);

  return ApiResponses.ok({
    success: true,
    message: `Received ${monitors.length} monitors`,
  });
}, LOG_CONTEXT);

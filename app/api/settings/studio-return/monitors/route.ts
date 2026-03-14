import { z } from "zod";
import { SettingsService } from "@/lib/services/SettingsService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";
import { MonitorInfoSchema } from "@/lib/models/StudioReturn";

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

  const validated = z.array(MonitorInfoSchema).parse(monitors);
  SettingsService.getInstance().saveStudioReturnMonitors(validated);

  return ApiResponses.ok({
    success: true,
    message: `Received ${validated.length} monitors`,
  });
}, LOG_CONTEXT);

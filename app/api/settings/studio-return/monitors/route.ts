import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";
import type { MonitorInfo } from "@/lib/models/StudioReturn";

const LOG_CONTEXT = "[StudioReturnMonitorsAPI]";

let knownMonitors: MonitorInfo[] = [];

/**
 * GET /api/settings/studio-return/monitors
 * Returns the list of monitors reported by the Tauri app
 */
export const GET = withSimpleErrorHandler(async () => {
  return ApiResponses.ok({ monitors: knownMonitors });
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

  knownMonitors = monitors;

  return ApiResponses.ok({
    success: true,
    message: `Received ${monitors.length} monitors`,
  });
}, LOG_CONTEXT);

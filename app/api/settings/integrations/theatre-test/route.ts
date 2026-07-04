import { z } from "zod";
import { TheaterDataResolverService } from "@/lib/services/TheaterDataResolverService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TheatreTestAPI]";

const schema = z.object({ url: z.string().optional() });

/**
 * POST /api/settings/integrations/theatre-test
 * Ping the local theater-data server (`GET /api/status`) to validate connectivity.
 * Tests the URL in the request body (the value typed in Settings, possibly unsaved);
 * falls back to the stored one when none is sent. Returns 200 with { success, message }
 * for both reachable and unreachable servers — a down server is a status, not an error.
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json().catch(() => ({}));
  const { url } = schema.parse(body ?? {});
  const result = await TheaterDataResolverService.getInstance().testConnection(url);
  return ApiResponses.ok({ success: result.ok, message: result.message });
}, LOG_CONTEXT);

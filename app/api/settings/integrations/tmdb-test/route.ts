import { z } from "zod";
import { TmdbResolverService } from "@/lib/services/TmdbResolverService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TmdbTestAPI]";

const schema = z.object({ apiKey: z.string().optional() });

/**
 * POST /api/settings/integrations/tmdb-test
 * Validate a TMDB API key. Tests the key in the request body (the value typed in
 * Settings, possibly unsaved); falls back to the stored key when none is sent.
 * Returns 200 with { success, message } for both valid and invalid keys — an
 * invalid key is a validation result, not a server error.
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json().catch(() => ({}));
  const { apiKey } = schema.parse(body ?? {});
  const result = await TmdbResolverService.getInstance().testConnection(apiKey);
  return ApiResponses.ok({ success: result.ok, message: result.message });
}, LOG_CONTEXT);

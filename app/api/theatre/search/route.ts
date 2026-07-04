import { TheaterDataResolverService } from "@/lib/services/TheaterDataResolverService";
import { THEATER_DATA } from "@/lib/config/Constants";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TheatreSearchAPI]";

/**
 * GET /api/theatre/search?q=...&limit=...
 *
 * Server-side proxy over the local theater-data base (`GET /api/search`). Runs
 * server-side so the JSON search avoids CORS and the setting/timeout/graceful
 * degradation stay centralized (the French response shape is normalized here too).
 * Each returned `posterUrl` is intentionally absolute (`${base}/poster/{id}`) so the
 * browser loads thumbnails directly from theater-data (image loads need no CORS) —
 * i.e. the base URL is deliberately exposed for images, not hidden. When the base is
 * unset/disabled or the server (WSL, manual) is down, the resolver yields `[]`
 * (empty state in the UI), never an error.
 */
export const GET = withSimpleErrorHandler(async (request: Request) => {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  const parsedLimit = Number(searchParams.get("limit"));
  const limit =
    Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(Math.floor(parsedLimit), 50)
      : THEATER_DATA.SEARCH_LIMIT;

  if (!q) return ApiResponses.ok({ candidates: [] });

  const candidates = await TheaterDataResolverService.getInstance().search(q, limit);
  return ApiResponses.ok({ candidates });
}, LOG_CONTEXT);

import { TheaterDataResolverService } from "@/lib/services/TheaterDataResolverService";
import { THEATER_DATA } from "@/lib/config/Constants";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TheatreSearchAPI]";

/**
 * GET /api/theatre/search?q=...&limit=...
 *
 * Server-side proxy over the local theater-data base (`GET /api/search`). Runs
 * server-side so there is no CORS and the base URL / French response shape never
 * leak to the browser. Returns normalized `TheatreCandidate[]`; when the base is
 * unset or the server (WSL, manual) is down, the resolver yields `[]` (empty
 * state in the UI), never an error.
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

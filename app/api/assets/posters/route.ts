import { PosterRepository } from "@/lib/repositories/PosterRepository";
import { posterSchema } from "@/lib/models/Poster";
import { randomUUID } from "crypto";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";
import { parseBooleanQueryParam } from "@/lib/utils/queryParams";

const LOG_CONTEXT = "[PostersAPI]";

/**
 * GET /api/assets/posters
 * List all posters
 * Query params:
 *   - enabled: "true" for enabled only, "false" for disabled only, omit for all
 */
export const GET = withSimpleErrorHandler(async (request: Request) => {
  const url = new URL(request.url);
  const enabled = parseBooleanQueryParam(url.searchParams.get("enabled"));

  const posterRepo = PosterRepository.getInstance();
  const posters = posterRepo.getAll(enabled);

  return ApiResponses.ok({ posters });
}, LOG_CONTEXT);

/**
 * POST /api/assets/posters
 * Create a new poster
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();

  const parseResult = posterSchema.safeParse({
    id: randomUUID(),
    ...body,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  if (!parseResult.success) {
    return ApiResponses.badRequest(
      "Invalid poster data",
      parseResult.error.flatten()
    );
  }

  const poster = parseResult.data;
  const posterRepo = PosterRepository.getInstance();
  posterRepo.create({
    ...poster,
    description: poster.description || null,
    source: poster.source || null,
  });

  return ApiResponses.created({ poster });
}, LOG_CONTEXT);


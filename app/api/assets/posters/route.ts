import { DatabaseService } from "@/lib/services/DatabaseService";
import { posterSchema } from "@/lib/models/Poster";
import { randomUUID } from "crypto";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[PostersAPI]";

/**
 * GET /api/assets/posters
 * List all posters
 */
export const GET = withSimpleErrorHandler(async () => {
  const db = DatabaseService.getInstance();
  const posters = db.getAllPosters();

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
  const db = DatabaseService.getInstance();
  db.createPoster({
    ...poster,
    description: poster.description || null,
    source: poster.source || null,
  });

  return ApiResponses.created({ poster });
}, LOG_CONTEXT);


import { DatabaseService } from "@/lib/services/DatabaseService";
import { updatePosterSchema } from "@/lib/models/Poster";
import {
  ApiResponses,
  withErrorHandler,
  RouteContext,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[PostersAPI]";

/**
 * GET /api/assets/posters/[id]
 * Get poster by ID
 */
export const GET = withErrorHandler<{ id: string }>(
  async (_request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const db = DatabaseService.getInstance();
    const poster = db.getPosterById(id);

    if (!poster) {
      return ApiResponses.notFound("Poster");
    }

    return ApiResponses.ok({ poster });
  },
  LOG_CONTEXT
);

/**
 * PATCH /api/assets/posters/[id]
 * Update poster
 */
export const PATCH = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const body = await request.json();

    const parseResult = updatePosterSchema.safeParse({
      ...body,
      id,
    });

    if (!parseResult.success) {
      return ApiResponses.badRequest(
        "Invalid poster data",
        parseResult.error.flatten()
      );
    }

    const updates = parseResult.data;
    const db = DatabaseService.getInstance();
    db.updatePoster(id, {
      ...updates,
      updatedAt: new Date(),
    });

    const poster = db.getPosterById(id);
    return ApiResponses.ok({ poster });
  },
  LOG_CONTEXT
);

/**
 * DELETE /api/assets/posters/[id]
 * Delete poster
 */
export const DELETE = withErrorHandler<{ id: string }>(
  async (_request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const db = DatabaseService.getInstance();
    db.deletePoster(id);

    return ApiResponses.ok({ success: true });
  },
  LOG_CONTEXT
);


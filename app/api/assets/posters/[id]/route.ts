import { PosterRepository } from "@/lib/repositories/PosterRepository";
import { updatePosterSchema } from "@/lib/models/Poster";
import {
  ApiResponses,
  withErrorHandler,
  RouteContext,
} from "@/lib/utils/ApiResponses";
import { broadcastDataChange } from "@/lib/utils/broadcastDataChange";
import { resolvePosterFileUrl } from "@/lib/utils/downloadToLocal";

const LOG_CONTEXT = "[PostersAPI]";

/**
 * GET /api/assets/posters/[id]
 * Get poster by ID
 */
export const GET = withErrorHandler<{ id: string }>(
  async (_request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const posterRepo = PosterRepository.getInstance();
    const poster = posterRepo.getById(id);

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

    // downloadToLocal is not part of updatePosterSchema — pull it out and, when
    // a remote fileUrl is provided, persist the file to local storage.
    const { downloadToLocal, ...rest } = body;
    if (rest.fileUrl) {
      rest.fileUrl = await resolvePosterFileUrl(rest.fileUrl, rest.type, downloadToLocal);
    }

    const parseResult = updatePosterSchema.safeParse({
      ...rest,
      id,
    });

    if (!parseResult.success) {
      return ApiResponses.badRequest(
        "Invalid poster data",
        parseResult.error.flatten()
      );
    }

    const updates = parseResult.data;
    const posterRepo = PosterRepository.getInstance();
    posterRepo.update(id, {
      ...updates,
      updatedAt: new Date(),
    });

    const poster = posterRepo.getById(id);
    broadcastDataChange("posters", "updated", request, id);
    return ApiResponses.ok({ poster });
  },
  LOG_CONTEXT
);

/**
 * DELETE /api/assets/posters/[id]
 * Delete poster
 */
export const DELETE = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const posterRepo = PosterRepository.getInstance();
    posterRepo.delete(id);

    broadcastDataChange("posters", "deleted", request, id);
    return ApiResponses.ok({ success: true });
  },
  LOG_CONTEXT
);


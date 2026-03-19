import { TitleRevealRepository } from "@/lib/repositories/TitleRevealRepository";
import { updateTitleRevealSchema } from "@/lib/models/TitleReveal";
import { urlToFilePath } from "@/lib/utils/fileUpload";
import { unlink } from "fs/promises";
import {
  ApiResponses,
  withErrorHandler,
  RouteContext,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[TitleRevealsAPI]";

/**
 * GET /api/assets/title-reveals/[id]
 * Get a single title reveal by ID
 */
export const GET = withErrorHandler<{ id: string }>(
  async (_request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const repo = TitleRevealRepository.getInstance();
    if (!repo.exists(id)) {
      return ApiResponses.notFound(`Title reveal with ID ${id}`);
    }
    const titleReveal = repo.getById(id);
    return ApiResponses.ok({ titleReveal });
  },
  LOG_CONTEXT
);

/**
 * PATCH /api/assets/title-reveals/[id]
 * Update title reveal
 */
export const PATCH = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const body = await request.json();
    const updates = updateTitleRevealSchema.parse({ id, ...body });
    const repo = TitleRevealRepository.getInstance();
    if (!repo.exists(id)) {
      return ApiResponses.notFound(`Title reveal with ID ${id}`);
    }
    repo.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
    const titleReveal = repo.getById(id);
    return ApiResponses.ok({ titleReveal });
  },
  LOG_CONTEXT
);

/**
 * DELETE /api/assets/title-reveals/[id]
 * Delete title reveal (also deletes logo file if present)
 */
export const DELETE = withErrorHandler<{ id: string }>(
  async (_request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const repo = TitleRevealRepository.getInstance();
    if (!repo.exists(id)) {
      return ApiResponses.notFound(`Title reveal with ID ${id}`);
    }

    // Delete associated logo file if it exists
    const titleReveal = repo.getById(id);
    if (titleReveal && titleReveal.logoUrl) {
      try {
        const filePath = urlToFilePath(titleReveal.logoUrl);
        await unlink(filePath);
      } catch {
        // File may already be deleted — not critical
      }
    }

    repo.delete(id);
    return ApiResponses.ok({ success: true });
  },
  LOG_CONTEXT
);

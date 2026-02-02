import { ProfileRepository } from "@/lib/repositories/ProfileRepository";
import { updateProfileSchema } from "@/lib/models/Profile";
import {
  ApiResponses,
  withErrorHandler,
  RouteContext,
} from "@/lib/utils/ApiResponses";
import { ZodError } from "zod";

const LOG_CONTEXT = "[ProfilesAPI]";

/**
 * PATCH /api/profiles/[id]
 * Update profile
 */
export const PATCH = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const body = await request.json();

    try {
      const updates = updateProfileSchema.parse(body);

      const profileRepo = ProfileRepository.getInstance();
      profileRepo.update(id, {
        ...updates,
        updatedAt: new Date(),
      });

      const profile = profileRepo.getById(id);
      return ApiResponses.ok({ profile });
    } catch (error) {
      if (error instanceof ZodError) {
        return ApiResponses.badRequest("Validation failed", error.errors);
      }
      throw error;
    }
  },
  LOG_CONTEXT
);

/**
 * PUT /api/profiles/[id]
 * Update profile (same as PATCH)
 */
export const PUT = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const body = await request.json();

    try {
      const updates = updateProfileSchema.parse(body);

      const profileRepo = ProfileRepository.getInstance();
      profileRepo.update(id, {
        ...updates,
        updatedAt: new Date(),
      });

      const profile = profileRepo.getById(id);
      return ApiResponses.ok({ profile });
    } catch (error) {
      if (error instanceof ZodError) {
        return ApiResponses.badRequest("Validation failed", error.errors);
      }
      throw error;
    }
  },
  LOG_CONTEXT
);

/**
 * DELETE /api/profiles/[id]
 * Delete profile
 */
export const DELETE = withErrorHandler<{ id: string }>(
  async (_request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const profileRepo = ProfileRepository.getInstance();
    profileRepo.delete(id);

    return ApiResponses.ok({ success: true });
  },
  LOG_CONTEXT
);


import { GuestRepository } from "@/lib/repositories/GuestRepository";
import { updateGuestSchema } from "@/lib/models/Guest";
import {
  ApiResponses,
  withErrorHandler,
  RouteContext,
} from "@/lib/utils/ApiResponses";
import { broadcastDataChange } from "@/lib/utils/broadcastDataChange";

const LOG_CONTEXT = "[GuestsAPI]";

/**
 * PATCH /api/assets/guests/[id]
 * Update guest
 */
export const PATCH = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const body = await request.json();
    // Clean up empty strings - convert to null for optional fields
    // Don't use || because it converts empty string to undefined
    const cleanedBody = {
      id, // Add the ID from URL params
      ...body,
      ...(body.subtitle !== undefined && {
        subtitle: body.subtitle === "" ? null : body.subtitle,
      }),
      ...(body.avatarUrl !== undefined && {
        avatarUrl: body.avatarUrl === "" ? null : body.avatarUrl,
      }),
    };
    const updates = updateGuestSchema.parse(cleanedBody);
    const guestRepo = GuestRepository.getInstance();
    guestRepo.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
    const guest = guestRepo.getById(id);
    broadcastDataChange("guests", "updated", request, id);
    return ApiResponses.ok({ guest });
  },
  LOG_CONTEXT
);

/**
 * DELETE /api/assets/guests/[id]
 * Delete guest
 */
export const DELETE = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const guestRepo = GuestRepository.getInstance();
    guestRepo.delete(id);
    broadcastDataChange("guests", "deleted", request, id);
    return ApiResponses.ok({ success: true });
  },
  LOG_CONTEXT
);

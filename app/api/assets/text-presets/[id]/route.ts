import { TextPresetRepository } from "@/lib/repositories/TextPresetRepository";
import { updateTextPresetSchema } from "@/lib/models/TextPreset";
import {
  ApiResponses,
  withErrorHandler,
  RouteContext,
} from "@/lib/utils/ApiResponses";
import { broadcastDataChange } from "@/lib/utils/broadcastDataChange";

const LOG_CONTEXT = "[TextPresetsAPI]";

/**
 * PATCH /api/assets/text-presets/[id]
 * Update text preset
 */
export const PATCH = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const body = await request.json();
    const cleanedBody = {
      id,
      ...body,
      ...(body.imageUrl !== undefined && {
        imageUrl: body.imageUrl === "" ? null : body.imageUrl,
      }),
      ...(body.imageAlt !== undefined && {
        imageAlt: body.imageAlt === "" ? null : body.imageAlt,
      }),
    };
    const updates = updateTextPresetSchema.parse(cleanedBody);
    const repo = TextPresetRepository.getInstance();
    if (!repo.exists(id)) {
      return ApiResponses.notFound(`Text preset with ID ${id}`);
    }
    repo.update(id, {
      ...updates,
      updatedAt: new Date(),
    });
    const textPreset = repo.getById(id);
    broadcastDataChange("textPresets", "updated", request, id);
    return ApiResponses.ok({ textPreset });
  },
  LOG_CONTEXT
);

/**
 * DELETE /api/assets/text-presets/[id]
 * Delete text preset
 */
export const DELETE = withErrorHandler<{ id: string }>(
  async (request: Request, context: RouteContext<{ id: string }>) => {
    const { id } = await context.params;
    const repo = TextPresetRepository.getInstance();
    if (!repo.exists(id)) {
      return ApiResponses.notFound(`Text preset with ID ${id}`);
    }
    repo.delete(id);
    broadcastDataChange("textPresets", "deleted", request, id);
    return ApiResponses.ok({ success: true });
  },
  LOG_CONTEXT
);

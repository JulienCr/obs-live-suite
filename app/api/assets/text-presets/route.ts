import { TextPresetRepository } from "@/lib/repositories/TextPresetRepository";
import { textPresetSchema } from "@/lib/models/TextPreset";
import { randomUUID } from "crypto";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";
import { parseBooleanQueryParam } from "@/lib/utils/queryParams";

const LOG_CONTEXT = "[TextPresetsAPI]";

/**
 * GET /api/assets/text-presets
 * List all text presets
 * Query params:
 *   - enabled: "true" for enabled only, "false" for disabled only, omit for all
 */
export const GET = withSimpleErrorHandler(async (request: Request) => {
  const url = new URL(request.url);
  const enabled = parseBooleanQueryParam(url.searchParams.get("enabled"));

  const repo = TextPresetRepository.getInstance();
  const textPresets = repo.getAll(enabled);
  return ApiResponses.ok({ textPresets });
}, LOG_CONTEXT);

/**
 * POST /api/assets/text-presets
 * Create a new text preset
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const cleanedBody = {
    ...body,
    imageUrl: body.imageUrl === "" ? null : body.imageUrl,
    imageAlt: body.imageAlt === "" ? null : body.imageAlt,
  };
  const textPreset = textPresetSchema.parse({
    id: randomUUID(),
    ...cleanedBody,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const repo = TextPresetRepository.getInstance();
  repo.create(textPreset);
  return ApiResponses.created({ textPreset });
}, LOG_CONTEXT);

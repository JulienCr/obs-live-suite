import { ProfileRepository } from "@/lib/repositories/ProfileRepository";
import { profileSchema } from "@/lib/models/Profile";
import { randomUUID } from "crypto";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";
import { ZodError } from "zod";

const LOG_CONTEXT = "[ProfilesAPI]";

/**
 * GET /api/profiles
 * List all profiles
 */
export const GET = withSimpleErrorHandler(async () => {
  const profileRepo = ProfileRepository.getInstance();
  const profiles = profileRepo.getAll();

  return ApiResponses.ok({ profiles });
}, LOG_CONTEXT);

/**
 * POST /api/profiles
 * Create a new profile
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();

  // Create default theme ID if not provided
  const themeId = body.themeId || "default-theme";

  try {
    const profile = profileSchema.parse({
      id: randomUUID(),
      ...body,
      themeId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const profileRepo = ProfileRepository.getInstance();
    profileRepo.create(profile);

    return ApiResponses.created({ profile });
  } catch (error) {
    if (error instanceof ZodError) {
      return ApiResponses.badRequest("Validation failed", error.errors);
    }
    throw error;
  }
}, LOG_CONTEXT);


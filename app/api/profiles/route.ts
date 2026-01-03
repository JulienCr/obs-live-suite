import { DatabaseService } from "@/lib/services/DatabaseService";
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
  const db = DatabaseService.getInstance();
  const profiles = db.getAllProfiles();

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

    const db = DatabaseService.getInstance();
    db.createProfile(profile);

    return ApiResponses.created({ profile });
  } catch (error) {
    if (error instanceof ZodError) {
      return ApiResponses.badRequest("Validation failed", error.errors);
    }
    throw error;
  }
}, LOG_CONTEXT);


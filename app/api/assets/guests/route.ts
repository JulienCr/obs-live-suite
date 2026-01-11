import { DatabaseService } from "@/lib/services/DatabaseService";
import { guestSchema } from "@/lib/models/Guest";
import { randomUUID } from "crypto";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";
import { parseBooleanQueryParam } from "@/lib/utils/queryParams";

const LOG_CONTEXT = "[GuestsAPI]";

/**
 * GET /api/assets/guests
 * List all guests
 * Query params:
 *   - enabled: "true" for enabled only, "false" for disabled only, omit for all
 */
export const GET = withSimpleErrorHandler(async (request: Request) => {
  const url = new URL(request.url);
  const enabled = parseBooleanQueryParam(url.searchParams.get("enabled"));

  const db = DatabaseService.getInstance();
  const guests = db.getAllGuests(enabled);
  return ApiResponses.ok({ guests });
}, LOG_CONTEXT);
/**
 * POST /api/assets/guests
 * Create a new guest
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    // Clean up empty strings - convert to null for optional fields
    const cleanedBody = {
      ...body,
      subtitle: body.subtitle === "" ? null : body.subtitle,
      avatarUrl: body.avatarUrl === "" ? null : body.avatarUrl,
    };
    const guest = guestSchema.parse({
      id: randomUUID(),
      ...cleanedBody,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const db = DatabaseService.getInstance();
    db.createGuest(guest);
    return ApiResponses.created({ guest });
  } catch (error) {
    console.error("[GuestsAPI] Guest creation error:", error);
    return ApiResponses.badRequest("Failed to create guest");
  }
}

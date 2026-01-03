import { DatabaseService } from "@/lib/services/DatabaseService";
import { guestSchema } from "@/lib/models/Guest";
import { randomUUID } from "crypto";
import { ApiResponses } from "@/lib/utils/ApiResponses";

/**
 * GET /api/assets/guests
 * List all guests
 */
export async function GET() {
  try {
    const db = DatabaseService.getInstance();
    const guests = db.getAllGuests();

    return ApiResponses.ok({ guests });
  } catch (error) {
    return ApiResponses.serverError("Failed to fetch guests");
  }
}

/**
 * POST /api/assets/guests
 * Create a new guest
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log("[POST Guest] Received body:", body);

    // Clean up empty strings - convert to null for optional fields
    const cleanedBody = {
      ...body,
      subtitle: body.subtitle === "" ? null : body.subtitle,
      avatarUrl: body.avatarUrl === "" ? null : body.avatarUrl,
    };

    console.log("[POST Guest] Cleaned body:", cleanedBody);

    const guest = guestSchema.parse({
      id: randomUUID(),
      ...cleanedBody,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("[POST Guest] Parsed guest:", guest);

    const db = DatabaseService.getInstance();
    db.createGuest(guest);

    console.log("[POST Guest] Guest created successfully");

    return ApiResponses.created({ guest });
  } catch (error) {
    console.error("Guest creation error:", error);
    return ApiResponses.badRequest("Failed to create guest");
  }
}


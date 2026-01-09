import { DatabaseService } from "@/lib/services/DatabaseService";
import { updateGuestSchema } from "@/lib/models/Guest";
import { ApiResponses } from "@/lib/utils/ApiResponses";
type RouteParams = { params: Promise<{ id: string }> };
/**
 * PATCH /api/assets/guests/[id]
 * Update guest
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
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
    const db = DatabaseService.getInstance();
    db.updateGuest(id, {
      ...updates,
      updatedAt: new Date(),
    });
    const guest = db.getGuestById(id);
    return ApiResponses.ok({ guest });
  } catch (error) {
    console.error("[GuestsAPI] Guest update error:", error);
    return ApiResponses.badRequest("Failed to update guest");
  }
}
/**
 * DELETE /api/assets/guests/[id]
 * Delete guest
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = DatabaseService.getInstance();
    db.deleteGuest(id);
    return ApiResponses.ok({ success: true });
  } catch (error) {
    return ApiResponses.serverError("Failed to delete guest");
  }
}

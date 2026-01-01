import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { updateGuestSchema } from "@/lib/models/Guest";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * PATCH /api/assets/guests/[id]
 * Update guest
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    console.log("[PATCH Guest] Received body:", body);

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

    console.log("[PATCH Guest] Cleaned body:", cleanedBody);
    const updates = updateGuestSchema.parse(cleanedBody);
    console.log("[PATCH Guest] Validated updates:", updates);

    const db = DatabaseService.getInstance();
    db.updateGuest(id, {
      ...updates,
      updatedAt: new Date(),
    });

    const guest = db.getGuestById(id);
    console.log("[PATCH Guest] Updated guest:", guest);
    return NextResponse.json({ guest });
  } catch (error) {
    console.error("Guest update error:", error);
    return NextResponse.json(
      { error: "Failed to update guest" },
      { status: 400 }
    );
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

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete guest" },
      { status: 500 }
    );
  }
}


import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { updateGuestSchema } from "@/lib/models/Guest";

/**
 * PATCH /api/assets/guests/[id]
 * Update guest
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const updates = updateGuestSchema.parse(body);
    
    const db = DatabaseService.getInstance();
    db.updateGuest(params.id, {
      ...updates,
      updatedAt: new Date(),
    });
    
    const guest = db.getGuestById(params.id);
    return NextResponse.json({ guest });
  } catch (error) {
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
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const db = DatabaseService.getInstance();
    db.deleteGuest(params.id);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete guest" },
      { status: 500 }
    );
  }
}


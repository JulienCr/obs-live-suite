import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { guestSchema } from "@/lib/models/Guest";
import { randomUUID } from "crypto";

/**
 * GET /api/assets/guests
 * List all guests
 */
export async function GET() {
  try {
    const db = DatabaseService.getInstance();
    const guests = db.getAllGuests();
    
    return NextResponse.json({ guests });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch guests" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assets/guests
 * Create a new guest
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const guest = guestSchema.parse({
      id: randomUUID(),
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const db = DatabaseService.getInstance();
    db.createGuest(guest);
    
    return NextResponse.json({ guest }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create guest" },
      { status: 400 }
    );
  }
}


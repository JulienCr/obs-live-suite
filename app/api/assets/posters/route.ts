import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { posterSchema } from "@/lib/models/Poster";
import { randomUUID } from "crypto";

/**
 * GET /api/assets/posters
 * List all posters
 */
export async function GET() {
  try {
    const db = DatabaseService.getInstance();
    const posters = db.getAllPosters();
    
    return NextResponse.json({ posters });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch posters" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/assets/posters
 * Create a new poster
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const poster = posterSchema.parse({
      id: randomUUID(),
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    const db = DatabaseService.getInstance();
    db.createPoster(poster);
    
    return NextResponse.json({ poster }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create poster" },
      { status: 400 }
    );
  }
}


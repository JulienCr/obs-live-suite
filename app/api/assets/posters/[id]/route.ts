import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { updatePosterSchema } from "@/lib/models/Poster";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/assets/posters/[id]
 * Get poster by ID
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = DatabaseService.getInstance();
    const poster = db.getPosterById(id);

    if (!poster) {
      return NextResponse.json({ error: "Poster not found" }, { status: 404 });
    }

    return NextResponse.json({ poster });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch poster" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/assets/posters/[id]
 * Update poster
 */
export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const updates = updatePosterSchema.parse({
      ...body,
      id,
    });

    const db = DatabaseService.getInstance();
    db.updatePoster(id, {
      ...updates,
      updatedAt: new Date(),
    });

    const poster = db.getPosterById(id);
    return NextResponse.json({ poster });
  } catch (error) {
    console.error("Failed to update poster:", error);
    return NextResponse.json(
      { error: "Failed to update poster" },
      { status: 400 }
    );
  }
}

/**
 * DELETE /api/assets/posters/[id]
 * Delete poster
 */
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const db = DatabaseService.getInstance();
    db.deletePoster(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete poster" },
      { status: 500 }
    );
  }
}


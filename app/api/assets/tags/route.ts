import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";

/**
 * GET /api/assets/tags
 * Returns all unique tags from all posters, sorted alphabetically
 */
export async function GET() {
  try {
    const db = DatabaseService.getInstance();
    const posters = await db.getAllPosters();

    // Extract all tags from all posters
    const allTags = posters.flatMap((poster) => poster.tags || []);

    // Remove duplicates using Set
    const uniqueTags = Array.from(new Set(allTags));

    // Sort alphabetically (case-insensitive)
    uniqueTags.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    return NextResponse.json({ tags: uniqueTags });
  } catch (error) {
    console.error("Failed to fetch tags:", error);
    return NextResponse.json(
      { error: "Failed to fetch tags" },
      { status: 500 }
    );
  }
}

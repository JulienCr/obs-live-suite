import { NextResponse } from "next/server";
import { PosterRepository } from "@/lib/repositories/PosterRepository";

export async function POST(request: Request) {
  try {
    const { ids } = await request.json();

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "Invalid or empty IDs array" },
        { status: 400 }
      );
    }

    const posterRepo = PosterRepository.getInstance();
    let deleted = 0;
    let failed = 0;

    for (const id of ids) {
      try {
        posterRepo.delete(id);
        deleted++;
      } catch (error) {
        failed++;
        console.error(`Failed to delete poster ${id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      deleted,
      failed
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json(
      { error: "Failed to bulk delete posters" },
      { status: 500 }
    );
  }
}

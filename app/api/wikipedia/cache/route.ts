import { NextRequest, NextResponse } from "next/server";
import { WikipediaCacheService } from "@/lib/services/WikipediaCacheService";

/**
 * DELETE /api/wikipedia/cache
 * Clear Wikipedia cache (memory + SQLite)
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const cache = WikipediaCacheService.getInstance();
    
    // Get stats before clearing
    const statsBefore = await cache.getStats();
    
    // Clear all caches
    await cache.clearAll();
    
    return NextResponse.json({
      success: true,
      message: "Cache cleared successfully",
      cleared: {
        memoryEntries: statsBefore.memoryEntries,
        sqliteEntries: statsBefore.sqliteEntries,
      },
    });
  } catch (error) {
    console.error("Failed to clear cache:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to clear cache",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/wikipedia/cache
 * Get cache statistics
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const cache = WikipediaCacheService.getInstance();
    const stats = await cache.getStats();
    
    return NextResponse.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Failed to get cache stats:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to get cache stats",
      },
      { status: 500 }
    );
  }
}



import { WikipediaCacheService } from "@/lib/services/WikipediaCacheService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[WikipediaCacheAPI]";

/**
 * DELETE /api/wikipedia/cache
 * Clear Wikipedia cache (memory + SQLite)
 */
export const DELETE = withSimpleErrorHandler(async () => {
  const cache = WikipediaCacheService.getInstance();

  // Get stats before clearing
  const statsBefore = await cache.getStats();

  // Clear all caches
  await cache.clearAll();

  return ApiResponses.ok({
    success: true,
    message: "Cache cleared successfully",
    cleared: {
      memoryEntries: statsBefore.memoryEntries,
      sqliteEntries: statsBefore.sqliteEntries,
    },
  });
}, LOG_CONTEXT);

/**
 * GET /api/wikipedia/cache
 * Get cache statistics
 */
export const GET = withSimpleErrorHandler(async () => {
  const cache = WikipediaCacheService.getInstance();
  const stats = await cache.getStats();

  return ApiResponses.ok({
    success: true,
    stats,
  });
}, LOG_CONTEXT);




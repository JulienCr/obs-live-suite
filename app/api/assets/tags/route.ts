import { DatabaseService } from "@/lib/services/DatabaseService";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[AssetsAPI:Tags]";

/**
 * GET /api/assets/tags
 * Returns all unique tags from all posters, sorted alphabetically
 */
export const GET = withSimpleErrorHandler(async () => {
  const db = DatabaseService.getInstance();
  const posters = await db.getAllPosters();

  // Extract all tags from all posters
  const allTags = posters.flatMap((poster) => poster.tags || []);

  // Remove duplicates using Set
  const uniqueTags = Array.from(new Set(allTags));

  // Sort alphabetically (case-insensitive)
  uniqueTags.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  return ApiResponses.ok({ tags: uniqueTags });
}, LOG_CONTEXT);

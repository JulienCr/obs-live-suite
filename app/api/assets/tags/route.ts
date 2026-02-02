import { PosterRepository } from "@/lib/repositories/PosterRepository";
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
  const posterRepo = PosterRepository.getInstance();
  const posters = posterRepo.getAll();

  // Extract all tags from all posters
  const allTags = posters.flatMap((poster) => poster.tags || []);

  // Remove duplicates using Set
  const uniqueTags = Array.from(new Set(allTags));

  // Sort alphabetically (case-insensitive)
  uniqueTags.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  return ApiResponses.ok({ tags: uniqueTags });
}, LOG_CONTEXT);

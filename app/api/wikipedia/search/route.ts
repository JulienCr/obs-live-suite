import { Logger } from "@/lib/utils/Logger";
import { WikipediaResolverService } from "@/lib/services/WikipediaResolverService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";
import { z } from "zod";

const LOG_CONTEXT = "[WikipediaSearchAPI]";
const logger = new Logger("WikipediaSearchAPI");

const searchRequestSchema = z.object({
  query: z.string().min(2).max(200),
});

/**
 * POST /api/wikipedia/search
 * Search Wikipedia and return multiple options for user to choose from
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const validationResult = searchRequestSchema.safeParse(body);

  if (!validationResult.success) {
    return ApiResponses.badRequest("Invalid query", validationResult.error.errors);
  }

  const { query } = validationResult.data;
  logger.info(`Searching Wikipedia for: "${query}"`);

  const resolver = WikipediaResolverService.getInstance();
  const results = await resolver.searchMultiple(query);

  if (!results || results.length === 0) {
    return ApiResponses.notFound("Wikipedia pages");
  }

  logger.info(`Found ${results.length} Wikipedia results for: "${query}"`);

  return ApiResponses.ok({
    success: true,
    query,
    results,
  });
}, LOG_CONTEXT);




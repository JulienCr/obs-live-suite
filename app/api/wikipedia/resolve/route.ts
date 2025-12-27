import { NextRequest, NextResponse } from "next/server";
import { Logger } from "@/lib/utils/Logger";
import { WikipediaResolverService } from "@/lib/services/WikipediaResolverService";
import { RateLimiterService, RateLimitPresets } from "@/lib/services/RateLimiterService";
import {
  wikipediaResolveRequestSchema,
  WikipediaNotFoundError,
  WikipediaTimeoutError,
  type WikipediaResolveResponse,
} from "@/lib/models/Wikipedia";

const logger = new Logger("WikipediaResolveAPI");

/**
 * POST /api/wikipedia/resolve
 * Resolve Wikipedia page and return raw extract (no LLM summarization)
 * Can accept either a query or a specific title
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = wikipediaResolveRequestSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid request:", validationResult.error);
      const response: WikipediaResolveResponse = {
        success: false,
        error: "Invalid request: " + validationResult.error.errors[0].message,
        code: "INVALID_INPUT",
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { query, title } = validationResult.data;

    // Rate limiting
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimiter = RateLimiterService.getInstance();

    if (!rateLimiter.checkLimit(clientIp, RateLimitPresets.WIKIPEDIA.limit, RateLimitPresets.WIKIPEDIA.window)) {
      logger.warn(`Rate limit exceeded for IP: ${clientIp}`);
      const response: WikipediaResolveResponse = {
        success: false,
        error: "Rate limit exceeded. Please try again later.",
        code: "RATE_LIMIT",
      };
      return NextResponse.json(response, { status: 429 });
    }

    logger.info(`Processing request: ${query}${title ? ` (title: ${title})` : ''}`);

    // Resolve Wikipedia page
    const resolver = WikipediaResolverService.getInstance();
    let wikipediaResult;

    try {
      if (title) {
        // If title is provided, fetch directly
        logger.info(`Fetching Wikipedia page by title: "${title}"`);
        wikipediaResult = await resolver.fetchByTitle(title);
      } else {
        // Otherwise, resolve from query
        wikipediaResult = await resolver.resolveAndFetch(query);
      }
      logger.info(`Wikipedia resolved: ${wikipediaResult.title} (source: ${wikipediaResult.source})`);
    } catch (error) {
      if (error instanceof WikipediaNotFoundError) {
        logger.warn(`Wikipedia page not found: ${query}`);
        const response: WikipediaResolveResponse = {
          success: false,
          error: "No Wikipedia page found for this query. Try rephrasing or being more specific.",
          code: "NOT_FOUND",
        };
        return NextResponse.json(response, { status: 404 });
      }

      if (error instanceof WikipediaTimeoutError) {
        logger.error(`Wikipedia request timeout: ${query}`);
        const response: WikipediaResolveResponse = {
          success: false,
          error: "Wikipedia request timed out. Please try again.",
          code: "TIMEOUT",
        };
        return NextResponse.json(response, { status: 504 });
      }

      throw error; // Re-throw unexpected errors
    }

    // Log metrics
    const duration = Date.now() - startTime;
    logger.info(
      `Request completed in ${duration}ms (resolution: ${wikipediaResult.source})`
    );

    // Return success response with raw extract (no LLM summarization)
    const response: WikipediaResolveResponse = {
      success: true,
      data: {
        title: wikipediaResult.title,
        extract: wikipediaResult.extract,
        thumbnail: wikipediaResult.thumbnail,
        url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(wikipediaResult.title)}`,
        source: wikipediaResult.source,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    // Catch-all for unexpected errors
    logger.error("Unexpected error in Wikipedia resolve API:", error);

    const response: WikipediaResolveResponse = {
      success: false,
      error: "An unexpected error occurred. Please try again later.",
      code: "INVALID_INPUT",
    };

    return NextResponse.json(response, { status: 500 });
  }
}



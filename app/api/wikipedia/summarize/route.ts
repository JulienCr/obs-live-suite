import { NextRequest, NextResponse } from "next/server";
import { Logger } from "@/lib/utils/Logger";
import { WikipediaResolverService } from "@/lib/services/WikipediaResolverService";
import { OllamaSummarizerService } from "@/lib/services/OllamaSummarizerService";
import { WikipediaCacheService } from "@/lib/services/WikipediaCacheService";
import { RateLimiterService, RateLimitPresets } from "@/lib/services/RateLimiterService";
import { z } from "zod";
import {
  wikipediaQuerySchema,
  WikipediaSource,
  WikipediaNotFoundError,
  WikipediaTimeoutError,
  InvalidSummaryError,
  type WikipediaApiResponse,
} from "@/lib/models/Wikipedia";

const logger = new Logger("WikipediaSummarizeAPI");

const wikipediaQuerySchemaExtended = wikipediaQuerySchema.extend({
  title: z.string().optional(), // Allow specifying exact title
});

/**
 * POST /api/wikipedia/summarize
 * Resolve Wikipedia page and summarize with LLM
 * Can accept either a query or a specific title
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = wikipediaQuerySchemaExtended.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid request:", validationResult.error);
      const response: WikipediaApiResponse = {
        success: false,
        error: "Invalid request: " + validationResult.error.errors[0].message,
        code: "INVALID_INPUT",
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { query, forceRefresh, title } = validationResult.data;

    // Rate limiting
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimiter = RateLimiterService.getInstance();

    if (!rateLimiter.checkLimit(clientIp, RateLimitPresets.WIKIPEDIA.limit, RateLimitPresets.WIKIPEDIA.window)) {
      logger.warn(`Rate limit exceeded for IP: ${clientIp}`);
      const response: WikipediaApiResponse = {
        success: false,
        error: "Rate limit exceeded. Please try again later.",
        code: "RATE_LIMIT",
      };
      return NextResponse.json(response, { status: 429 });
    }

    logger.info(`Processing request: ${query}${title ? ` (title: ${title})` : ''} (forceRefresh: ${forceRefresh})`);

    // Check cache (unless forceRefresh) - use title if provided, otherwise query
    const cacheKey = (title || query) as string;
    const cache = WikipediaCacheService.getInstance();
    if (!forceRefresh) {
      const cachedResult = await cache.get(cacheKey);
      if (cachedResult) {
        logger.info(`Returning cached result for: ${cacheKey}`);
        const response: WikipediaApiResponse = {
          success: true,
          data: {
            query,
            title: cachedResult.title,
            summary: cachedResult.summary,
            thumbnail: cachedResult.thumbnail,
            source: WikipediaSource.CACHE,
            cached: true,
            rawExtract: cachedResult.rawExtract, // Add raw extract from cache
            url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(cachedResult.title)}`,
          },
        };
        return NextResponse.json(response);
      }
    }

    // Step 1: Resolve Wikipedia page
    const resolver = WikipediaResolverService.getInstance();
    let wikipediaResult;

    try {
      if (title) {
        // If title is provided, fetch directly
        logger.info(`Fetching Wikipedia page by title: "${title}"`);
        wikipediaResult = await resolver.fetchByTitle(title as string);
      } else {
        // Otherwise, resolve from query
        wikipediaResult = await resolver.resolveAndFetch(query as string);
      }
      logger.info(`Wikipedia resolved: ${wikipediaResult.title} (source: ${wikipediaResult.source})`);
    } catch (error) {
      if (error instanceof WikipediaNotFoundError) {
        logger.warn(`Wikipedia page not found: ${query}`);
        const response: WikipediaApiResponse = {
          success: false,
          error: "No Wikipedia page found for this query. Try rephrasing or being more specific.",
          code: "NOT_FOUND",
        };
        return NextResponse.json(response, { status: 404 });
      }

      if (error instanceof WikipediaTimeoutError) {
        logger.error(`Wikipedia request timeout: ${query}`);
        const response: WikipediaApiResponse = {
          success: false,
          error: "Wikipedia request timed out. Please try again.",
          code: "TIMEOUT",
        };
        return NextResponse.json(response, { status: 504 });
      }

      throw error; // Re-throw unexpected errors
    }

    // Step 2: Summarize with Ollama
    const summarizer = OllamaSummarizerService.getInstance();
    let summary: string[];

    try {
      summary = await summarizer.summarize(wikipediaResult.extract);
      logger.info(`Summary generated: ${summary.length} lines`);
    } catch (error) {
      if (error instanceof InvalidSummaryError) {
        logger.error(`Ollama summarization failed: ${error.message}`);
        const response: WikipediaApiResponse = {
          success: false,
          error: "Failed to generate summary. The LLM service may be unavailable.",
          code: "LLM_ERROR",
        };
        return NextResponse.json(response, { status: 503 });
      }

      throw error;
    }

    // Step 3: Cache the result (use title as key if provided, otherwise query)
    const cachedResult = {
      summary,
      thumbnail: wikipediaResult.thumbnail,
      timestamp: Date.now() / 1000, // Unix timestamp in seconds
      source: wikipediaResult.source,
      title: wikipediaResult.title,
      rawExtract: wikipediaResult.extract, // Add raw extract to cache
    };

    await cache.set((title || query) as string, cachedResult);

    // Log metrics
    const duration = Date.now() - startTime;
    logger.info(
      `Request completed in ${duration}ms (resolution: ${wikipediaResult.source}, cached: false)`
    );

    // Return success response
    const response: WikipediaApiResponse = {
      success: true,
      data: {
        query: query as string,
        title: wikipediaResult.title,
        summary,
        thumbnail: wikipediaResult.thumbnail,
        source: wikipediaResult.source,
        cached: false,
        rawExtract: wikipediaResult.extract, // Add raw Wikipedia extract
        url: `https://fr.wikipedia.org/wiki/${encodeURIComponent(wikipediaResult.title)}`, // Add Wikipedia URL
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    // Catch-all for unexpected errors
    logger.error("Unexpected error in Wikipedia summarize API:", error);

    const response: WikipediaApiResponse = {
      success: false,
      error: "An unexpected error occurred. Please try again later.",
      code: "LLM_ERROR",
    };

    return NextResponse.json(response, { status: 500 });
  }
}


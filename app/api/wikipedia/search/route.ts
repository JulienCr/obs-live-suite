import { NextRequest, NextResponse } from "next/server";
import { Logger } from "@/lib/utils/Logger";
import { WikipediaResolverService } from "@/lib/services/WikipediaResolverService";
import { z } from "zod";

const logger = new Logger("WikipediaSearchAPI");

const searchRequestSchema = z.object({
  query: z.string().min(2).max(200),
});

/**
 * POST /api/wikipedia/search
 * Search Wikipedia and return multiple options for user to choose from
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const validationResult = searchRequestSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Invalid query",
          details: validationResult.error.errors 
        },
        { status: 400 }
      );
    }

    const { query } = validationResult.data;
    logger.info(`Searching Wikipedia for: "${query}"`);

    const resolver = WikipediaResolverService.getInstance();
    const results = await resolver.searchMultiple(query);

    if (!results || results.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No Wikipedia pages found for this query",
        },
        { status: 404 }
      );
    }

    logger.info(`Found ${results.length} Wikipedia results for: "${query}"`);

    return NextResponse.json({
      success: true,
      query,
      results,
    });
  } catch (error) {
    logger.error("Error searching Wikipedia:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



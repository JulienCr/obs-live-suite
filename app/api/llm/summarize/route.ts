import { NextRequest, NextResponse } from "next/server";
import { Logger } from "@/lib/utils/Logger";
import { OllamaSummarizerService } from "@/lib/services/OllamaSummarizerService";
import { RateLimiterService, RateLimitPresets } from "@/lib/services/RateLimiterService";
import {
  llmSummarizeRequestSchema,
  type LLMSummarizeResponse,
} from "@/lib/models/LLM";
import { InvalidSummaryError } from "@/lib/models/Wikipedia";

const logger = new Logger("LLMSummarizeAPI");

/**
 * POST /api/llm/summarize
 * Summarize any text using the configured LLM provider
 * Accepts free text or Wikipedia extracts
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = llmSummarizeRequestSchema.safeParse(body);

    if (!validationResult.success) {
      logger.warn("Invalid request:", validationResult.error);
      const response: LLMSummarizeResponse = {
        success: false,
        error: "Invalid request: " + validationResult.error.errors[0].message,
        code: "INVALID_INPUT",
      };
      return NextResponse.json(response, { status: 400 });
    }

    const { text } = validationResult.data;

    // Rate limiting
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const rateLimiter = RateLimiterService.getInstance();

    // Use Wikipedia rate limit preset (or create a dedicated LLM preset if needed)
    if (!rateLimiter.checkLimit(clientIp, RateLimitPresets.WIKIPEDIA.limit, RateLimitPresets.WIKIPEDIA.window)) {
      logger.warn(`Rate limit exceeded for IP: ${clientIp}`);
      const response: LLMSummarizeResponse = {
        success: false,
        error: "Rate limit exceeded. Please try again later.",
        code: "RATE_LIMIT",
      };
      return NextResponse.json(response, { status: 429 });
    }

    logger.info(`Processing summarization request (${text.length} chars)`);

    // Summarize with LLM
    const summarizer = OllamaSummarizerService.getInstance();
    let summary: string[];

    try {
      summary = await summarizer.summarize(text);
      logger.info(`Summary generated: ${summary.length} lines`);
    } catch (error) {
      if (error instanceof InvalidSummaryError) {
        logger.error(`LLM summarization failed: ${error.message}`);
        const response: LLMSummarizeResponse = {
          success: false,
          error: "Failed to generate summary. The LLM service may be unavailable.",
          code: "LLM_ERROR",
        };
        return NextResponse.json(response, { status: 503 });
      }

      throw error;
    }

    // Log metrics
    const duration = Date.now() - startTime;
    logger.info(`Request completed in ${duration}ms`);

    // Return success response
    const response: LLMSummarizeResponse = {
      success: true,
      data: {
        summary,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    // Catch-all for unexpected errors
    logger.error("Unexpected error in LLM summarize API:", error);

    const response: LLMSummarizeResponse = {
      success: false,
      error: "An unexpected error occurred. Please try again later.",
      code: "LLM_ERROR",
    };

    return NextResponse.json(response, { status: 500 });
  }
}



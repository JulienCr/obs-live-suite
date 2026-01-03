import { NextRequest, NextResponse } from "next/server";
import { OllamaSummarizerService } from "@/lib/services/OllamaSummarizerService";
import { apiError } from "@/lib/utils/apiError";

/**
 * POST /api/ollama/test
 * Test Ollama connectivity and configuration
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const summarizer = OllamaSummarizerService.getInstance();
    const result = await summarizer.testConnection();

    if (result.success) {
      const config = summarizer.getConfig();
      return NextResponse.json({
        success: true,
        message: "Ollama connection successful",
        config: {
          url: config.url,
          model: config.model,
          num_ctx: config.num_ctx,
        },
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 503 }
      );
    }
  } catch (error) {
    return apiError(error, "Ollama connection test failed", { context: "[OllamaAPI]" });
  }
}

/**
 * GET /api/ollama/test
 * Get list of available Ollama models
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const summarizer = OllamaSummarizerService.getInstance();
    const models = await summarizer.getAvailableModels();

    return NextResponse.json({
      success: true,
      models,
    });
  } catch (error) {
    return apiError(error, "Failed to get Ollama models", { context: "[OllamaAPI]" });
  }
}


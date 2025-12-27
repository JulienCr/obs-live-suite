import { NextRequest, NextResponse } from "next/server";
import { OllamaSummarizerService } from "@/lib/services/OllamaSummarizerService";

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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
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
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        models: [],
      },
      { status: 500 }
    );
  }
}


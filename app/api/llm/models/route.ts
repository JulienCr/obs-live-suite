import { NextResponse } from "next/server";
import { OllamaSummarizerService } from "@/lib/services/OllamaSummarizerService";

/**
 * GET /api/llm/models
 * Get available models for the currently configured LLM provider
 */
export async function GET() {
  try {
    const summarizer = OllamaSummarizerService.getInstance();
    const models = await summarizer.getAvailableModels();

    return NextResponse.json({
      success: true,
      models,
      provider: summarizer.getProviderName(),
    });
  } catch (error) {
    console.error("Failed to get available models:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        models: [],
      },
      { status: 500 }
    );
  }
}



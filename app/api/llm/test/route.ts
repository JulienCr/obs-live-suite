import { NextResponse } from "next/server";
import { LLMProviderFactory } from "@/lib/services/llm/LLMProviderFactory";
import { LLMProviderType, type LLMConfig } from "@/lib/services/llm/LLMProvider";
import { z } from "zod";

const testRequestSchema = z.object({
  llm_provider: z.nativeEnum(LLMProviderType),
  ollama_url: z.string().optional(),
  ollama_model: z.string().optional(),
  openai_api_key: z.string().optional(),
  openai_model: z.string().optional(),
  anthropic_api_key: z.string().optional(),
  anthropic_model: z.string().optional(),
});

/**
 * POST /api/llm/test
 * Test connection to the configured LLM provider
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const settings = testRequestSchema.parse(body);

    // Create provider from settings
    const config: LLMConfig = {
      provider: settings.llm_provider,
      ollamaUrl: settings.ollama_url,
      ollamaModel: settings.ollama_model,
      openaiApiKey: settings.openai_api_key,
      openaiModel: settings.openai_model,
      anthropicApiKey: settings.anthropic_api_key,
      anthropicModel: settings.anthropic_model,
    };

    const provider = LLMProviderFactory.createFromConfig(config);
    const result = await provider.testConnection();

    if (result.success) {
      return NextResponse.json({
        success: true,
        provider: provider.getName(),
        message: `Successfully connected to ${provider.getName()}`,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          provider: provider.getName(),
          error: result.error || "Connection failed",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("LLM test failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}




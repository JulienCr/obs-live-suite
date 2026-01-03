import { LLMProviderFactory } from "@/lib/services/llm/LLMProviderFactory";
import {
  LLMProviderType,
  type LLMConfig,
} from "@/lib/services/llm/LLMProvider";
import { z } from "zod";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[LLMAPI]";

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
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const parseResult = testRequestSchema.safeParse(body);

  if (!parseResult.success) {
    return ApiResponses.badRequest(
      "Invalid request",
      parseResult.error.errors
    );
  }

  const settings = parseResult.data;

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
    return ApiResponses.ok({
      success: true,
      provider: provider.getName(),
      message: `Successfully connected to ${provider.getName()}`,
    });
  } else {
    return ApiResponses.serverError(result.error || "Connection failed");
  }
}, LOG_CONTEXT);




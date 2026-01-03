import { OllamaSummarizerService } from "@/lib/services/OllamaSummarizerService";
import {
  ApiResponses,
  withSimpleErrorHandler,
} from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[LLMAPI]";

/**
 * GET /api/llm/models
 * Get available models for the currently configured LLM provider
 */
export const GET = withSimpleErrorHandler(async () => {
  const summarizer = OllamaSummarizerService.getInstance();
  const models = await summarizer.getAvailableModels();

  return ApiResponses.ok({
    success: true,
    models,
    provider: summarizer.getProviderName(),
  });
}, LOG_CONTEXT);




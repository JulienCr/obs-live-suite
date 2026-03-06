import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOllama } from "ollama-ai-provider";
import { getProviderConfig } from "@/lib/services/llm/providerConfig";
import { LLMProviderType } from "@/lib/services/llm/LLMProvider";
import type { LanguageModel } from "ai";

export class AiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiConfigError";
  }
}

/**
 * Creates an AI SDK LanguageModel from the LLM settings stored in database.
 * Supports Ollama, OpenAI, and Anthropic providers.
 */
export function createAiModel(): LanguageModel {
  const config = getProviderConfig();

  switch (config.type) {
    case LLMProviderType.OPENAI: {
      if (!config.apiKey) throw new AiConfigError("OpenAI API key is not configured");
      const openai = createOpenAI({ apiKey: config.apiKey });
      return openai(config.model);
    }

    case LLMProviderType.ANTHROPIC: {
      if (!config.apiKey) throw new AiConfigError("Anthropic API key is not configured");
      const anthropic = createAnthropic({ apiKey: config.apiKey });
      return anthropic(config.model);
    }

    case LLMProviderType.OLLAMA:
    default: {
      const ollama = createOllama({ baseURL: config.baseURL! });
      return ollama(config.model) as unknown as LanguageModel;
    }
  }
}

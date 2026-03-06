import { createOpenAI } from "@ai-sdk/openai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOllama } from "ollama-ai-provider";
import { SettingsRepository } from "@/lib/repositories/SettingsRepository";
import { LLMProviderType } from "@/lib/services/llm/LLMProvider";
import { LLM_URLS } from "@/lib/config/Constants";
import type { LanguageModel } from "ai";

/**
 * Creates an AI SDK LanguageModel from the LLM settings stored in database.
 * Supports Ollama, OpenAI, and Anthropic providers.
 */
export function createAiModel(): LanguageModel {
  const db = SettingsRepository.getInstance();
  const providerType =
    (db.getSetting("llm_provider") as LLMProviderType) ||
    LLMProviderType.OLLAMA;

  switch (providerType) {
    case LLMProviderType.OPENAI: {
      const apiKey = db.getSetting("openai_api_key") || "";
      const model = db.getSetting("openai_model") || "gpt-4o-mini";
      if (!apiKey) throw new Error("OpenAI API key is not configured");
      const openai = createOpenAI({ apiKey });
      return openai(model);
    }

    case LLMProviderType.ANTHROPIC: {
      const apiKey = db.getSetting("anthropic_api_key") || "";
      const model =
        db.getSetting("anthropic_model") || "claude-sonnet-4-20250514";
      if (!apiKey) throw new Error("Anthropic API key is not configured");
      const anthropic = createAnthropic({ apiKey });
      return anthropic(model);
    }

    case LLMProviderType.OLLAMA:
    default: {
      const baseURL =
        db.getSetting("ollama_url") || LLM_URLS.OLLAMA_DEFAULT;
      const model = db.getSetting("ollama_model") || "mistral:latest";
      const ollama = createOllama({ baseURL });
      return ollama(model) as unknown as LanguageModel;
    }
  }
}

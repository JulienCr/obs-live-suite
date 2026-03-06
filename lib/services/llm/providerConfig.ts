import { SettingsRepository } from "@/lib/repositories/SettingsRepository";
import { LLMProviderType } from "./LLMProvider";
import { LLM_URLS } from "@/lib/config/Constants";

export interface ProviderConfig {
  type: LLMProviderType;
  model: string;
  apiKey?: string;
  baseURL?: string;
}

const DEFAULT_MODELS: Record<LLMProviderType, string> = {
  [LLMProviderType.OPENAI]: "gpt-5-mini",
  [LLMProviderType.ANTHROPIC]: "claude-haiku-4-5-20251001",
  [LLMProviderType.OLLAMA]: "mistral:latest",
};

/**
 * Reads LLM provider settings from the database and returns a unified config.
 * Shared by both LLMProviderFactory (summarization) and AiProviderFactory (AI SDK chat).
 */
export function getProviderConfig(): ProviderConfig {
  const db = SettingsRepository.getInstance();
  const type =
    (db.getSetting("llm_provider") as LLMProviderType) ||
    LLMProviderType.OLLAMA;

  switch (type) {
    case LLMProviderType.OPENAI:
      return {
        type,
        apiKey: db.getSetting("openai_api_key") || "",
        model: db.getSetting("openai_model") || DEFAULT_MODELS[type],
      };

    case LLMProviderType.ANTHROPIC:
      return {
        type,
        apiKey: db.getSetting("anthropic_api_key") || "",
        model: db.getSetting("anthropic_model") || DEFAULT_MODELS[type],
      };

    case LLMProviderType.OLLAMA:
    default:
      return {
        type: LLMProviderType.OLLAMA,
        baseURL: db.getSetting("ollama_url") || LLM_URLS.OLLAMA_DEFAULT,
        model: db.getSetting("ollama_model") || DEFAULT_MODELS[LLMProviderType.OLLAMA],
      };
  }
}

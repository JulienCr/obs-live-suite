import { LLMProvider, LLMProviderType, LLMConfig } from "./LLMProvider";
import { OllamaProvider } from "./OllamaProvider";
import { OpenAIProvider } from "./OpenAIProvider";
import { AnthropicProvider } from "./AnthropicProvider";
import { DatabaseService } from "../DatabaseService";
import { Logger } from "../../utils/Logger";
import { LLM } from "../../config/Constants";

/**
 * Factory to create LLM providers based on configuration
 */
export class LLMProviderFactory {
  private static logger = new Logger("LLMProviderFactory");

  /**
   * Create a provider from database settings
   */
  static createFromSettings(): LLMProvider {
    const db = DatabaseService.getInstance();
    
    // Get provider type
    const providerType = (db.getSetting("llm_provider") as LLMProviderType) || LLMProviderType.OLLAMA;

    this.logger.info(`Creating LLM provider: ${providerType}`);

    switch (providerType) {
      case LLMProviderType.OPENAI:
        return new OpenAIProvider({
          apiKey: db.getSetting("openai_api_key") || "",
          model: db.getSetting("openai_model") || "gpt-5-mini",
          temperature: LLM.DEFAULT_TEMPERATURE,
          timeout: LLM.DEFAULT_TIMEOUT_MS,
        });

      case LLMProviderType.ANTHROPIC:
        return new AnthropicProvider({
          apiKey: db.getSetting("anthropic_api_key") || "",
          model: db.getSetting("anthropic_model") || "claude-3-5-sonnet-20241022",
          temperature: LLM.DEFAULT_TEMPERATURE,
          timeout: LLM.DEFAULT_TIMEOUT_MS,
        });

      case LLMProviderType.OLLAMA:
      default:
        return new OllamaProvider({
          url: db.getSetting("ollama_url") || "http://localhost:11434",
          model: db.getSetting("ollama_model") || "mistral:latest",
          temperature: LLM.DEFAULT_TEMPERATURE,
          timeout: LLM.DEFAULT_TIMEOUT_MS,
        });
    }
  }

  /**
   * Create a provider from explicit config
   */
  static createFromConfig(config: LLMConfig): LLMProvider {
    switch (config.provider) {
      case LLMProviderType.OPENAI:
        if (!config.openaiApiKey) {
          throw new Error("OpenAI API key is required");
        }
        return new OpenAIProvider({
          apiKey: config.openaiApiKey,
          model: config.openaiModel || "gpt-5-mini",
          temperature: config.temperature,
          timeout: config.timeout,
        });

      case LLMProviderType.ANTHROPIC:
        if (!config.anthropicApiKey) {
          throw new Error("Anthropic API key is required");
        }
        return new AnthropicProvider({
          apiKey: config.anthropicApiKey,
          model: config.anthropicModel || "claude-3-5-sonnet-20241022",
          temperature: config.temperature,
          timeout: config.timeout,
        });

      case LLMProviderType.OLLAMA:
      default:
        return new OllamaProvider({
          url: config.ollamaUrl || "http://localhost:11434",
          model: config.ollamaModel || "mistral:latest",
          temperature: config.temperature,
          timeout: config.timeout,
        });
    }
  }
}


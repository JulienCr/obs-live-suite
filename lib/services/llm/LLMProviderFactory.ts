import { LLMProvider, LLMProviderType, LLMConfig } from "./LLMProvider";
import { OllamaProvider } from "./OllamaProvider";
import { OpenAIProvider } from "./OpenAIProvider";
import { AnthropicProvider } from "./AnthropicProvider";
import { getProviderConfig } from "./providerConfig";
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
    const config = getProviderConfig();

    this.logger.info(`Creating LLM provider: ${config.type}`);

    switch (config.type) {
      case LLMProviderType.OPENAI:
        return new OpenAIProvider({
          apiKey: config.apiKey || "",
          model: config.model,
          temperature: LLM.DEFAULT_TEMPERATURE,
          timeout: LLM.DEFAULT_TIMEOUT_MS,
        });

      case LLMProviderType.ANTHROPIC:
        return new AnthropicProvider({
          apiKey: config.apiKey || "",
          model: config.model,
          temperature: LLM.DEFAULT_TEMPERATURE,
          timeout: LLM.DEFAULT_TIMEOUT_MS,
        });

      case LLMProviderType.OLLAMA:
      default:
        return new OllamaProvider({
          url: config.baseURL || "",
          model: config.model,
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
          url: config.ollamaUrl || LLM_URLS.OLLAMA_DEFAULT,
          model: config.ollamaModel || "mistral:latest",
          temperature: config.temperature,
          timeout: config.timeout,
        });
    }
  }
}


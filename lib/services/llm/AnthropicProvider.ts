import { LLMProvider } from "./LLMProvider";
import { Logger } from "../../utils/Logger";
import { buildSummarizationPrompt } from "./PromptTemplates";
import {
  fetchWithTimeout,
  TimeoutError,
} from "../../utils/fetchWithTimeout";

/**
 * Anthropic (Claude) LLM Provider
 */
export class AnthropicProvider implements LLMProvider {
  private logger: Logger;
  private apiKey: string;
  private model: string;
  private temperature: number;
  private timeout: number;

  constructor(config: {
    apiKey: string;
    model: string;
    temperature?: number;
    timeout?: number;
  }) {
    this.logger = new Logger("AnthropicProvider");
    this.apiKey = config.apiKey;
    this.model = config.model || "claude-sonnet-4"; // Default to cost-effective model
    this.temperature = config.temperature ?? 0.3;
    this.timeout = config.timeout ?? 60000; // 60 seconds
  }

  getName(): string {
    return "Anthropic (Claude)";
  }

  async summarize(content: string): Promise<string> {
    const prompt = this.buildPrompt(content);

    try {
      const response = await this.callAnthropic(prompt);
      return response;
    } catch (error) {
      this.logger.error("Anthropic summarization failed:", error);
      throw new Error(
        `Failed to summarize with Anthropic: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Anthropic doesn't have a simple test endpoint, so we make a minimal request
      const response = await fetchWithTimeout(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: 10,
            messages: [
              {
                role: "user",
                content: "test",
              },
            ],
          }),
          timeout: 5000,
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        return {
          success: false,
          error: error.error?.message || `API returned ${response.status}`,
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private buildPrompt(content: string): string {
    return buildSummarizationPrompt(content);
  }

  private async callAnthropic(prompt: string): Promise<string> {
    try {
      const response = await fetchWithTimeout(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": this.apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: 500,
            temperature: this.temperature,
            messages: [
              {
                role: "user",
                content: prompt,
              },
            ],
          }),
          timeout: this.timeout,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          `Anthropic API error: ${response.status} ${errorData.error?.message || response.statusText}`
        );
      }

      const data = await response.json();
      return data.content?.[0]?.text || "";
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new Error(`Anthropic request timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }
}


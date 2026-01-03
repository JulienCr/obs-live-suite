import { LLMProvider } from "./LLMProvider";
import { Logger } from "../../utils/Logger";
import { buildSummarizationPrompt } from "./PromptTemplates";
import {
  fetchWithTimeout,
  TimeoutError,
} from "../../utils/fetchWithTimeout";

/**
 * Ollama LLM Provider
 */
export class OllamaProvider implements LLMProvider {
  private logger: Logger;
  private url: string;
  private model: string;
  private temperature: number;
  private timeout: number;

  constructor(config: {
    url: string;
    model: string;
    temperature?: number;
    timeout?: number;
  }) {
    this.logger = new Logger("OllamaProvider");
    this.url = config.url;
    this.model = config.model;
    this.temperature = config.temperature ?? 0.3;
    this.timeout = config.timeout ?? 60000; // 60 seconds
  }

  getName(): string {
    return "Ollama";
  }

  async summarize(content: string): Promise<string> {
    const prompt = this.buildPrompt(content);

    try {
      const response = await this.callOllama(prompt);
      return response;
    } catch (error) {
      this.logger.error("Ollama summarization failed:", error);
      throw new Error(
        `Failed to summarize with Ollama: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      const url = `${this.url}/api/tags`;
      const response = await fetchWithTimeout(url, { timeout: 5000 });

      if (!response.ok) {
        return {
          success: false,
          error: `Ollama API returned ${response.status}`,
        };
      }

      const data = await response.json();
      const hasModel = data.models?.some(
        (m: { name: string }) => m.name === this.model
      );

      if (!hasModel) {
        return {
          success: false,
          error: `Model ${this.model} not found`,
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

  private async callOllama(prompt: string): Promise<string> {
    const url = `${this.url}/api/generate`;

    try {
      const response = await fetchWithTimeout(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          options: {
            num_ctx: 2048,
            temperature: this.temperature,
          },
        }),
        timeout: this.timeout,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        throw new Error(`Ollama API error: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      return data.response || "";
    } catch (error) {
      if (error instanceof TimeoutError) {
        throw new Error(`Ollama request timed out after ${this.timeout}ms`);
      }
      throw error;
    }
  }
}


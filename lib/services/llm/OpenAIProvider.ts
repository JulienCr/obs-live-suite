import OpenAI from "openai";
import { Logger } from "../../utils/Logger";
import type { LLMProvider } from "./LLMProvider";

// Force temperature to 1 for this models 

const modelsWithTemperature1 = [
  "gpt-5-nano",
  "gpt-5-mini",
];

/**
 * OpenAI LLM Provider using official SDK
 */
export class OpenAIProvider implements LLMProvider {
  private logger: Logger;
  private client: OpenAI;
  private model: string;
  private temperature: number;
  private timeout: number;

  constructor(config: {
    apiKey: string;
    model: string;
    temperature?: number;
    timeout?: number;
  }) {
    this.logger = new Logger("OpenAIProvider");
    this.model = config.model || "gpt-5-nano";
    this.temperature = modelsWithTemperature1.includes(this.model) ? 1 : config.temperature ?? 0.3;
    this.timeout = config.timeout ?? 60000; // 60 seconds

    this.client = new OpenAI({
      apiKey: config.apiKey,
      timeout: this.timeout,
    });
  }

  getName(): string {
    return "OpenAI";
  }

  async summarize(content: string): Promise<string> {
    const prompt = this.buildPrompt(content);

    try {
      const response = await this.callOpenAI(prompt);
      return response;
    } catch (error) {
      this.logger.error("OpenAI summarization failed:", error);
      throw new Error(
        `Failed to summarize with OpenAI: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      // Simple test: list models
      await this.client.models.list();
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private buildPrompt(content: string): string {
    return `Résume le texte ci-dessous pour un overlay à l'écran.

Contraintes :
- Sortie EXACTEMENT 3 à 5 lignes.
- Le markdown est autorisé (mais reste minimal).
- Chaque ligne DOIT faire au maximum 100 caractères.
- Pas de numérotation et pas de puces.
- Pas d'introduction, pas d'avertissement.

Texte : ${content}

Résumé (3-5 lignes) :`;
  }

  private async callOpenAI(prompt: string): Promise<string> {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: "system",
            content: "Tu es un assistant qui résume des textes de manière concise pour des overlays TV.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: this.temperature,
        max_completion_tokens: 2000, // Increased for reasoning models
      });

      // Log full response for debugging
      this.logger.info("OpenAI full response:", JSON.stringify(completion, null, 2));

      const message = completion.choices[0]?.message;
      this.logger.info("Message object:", JSON.stringify(message, null, 2));

      const content = message?.content || "";

      if (!content) {
        this.logger.error("OpenAI returned no content. Full response:", completion);
        throw new Error("OpenAI returned empty response");
      }

      this.logger.info(`OpenAI response: ${content.length} characters`);
      return content;
    } catch (error) {
      this.logger.error("OpenAI API error:", error);
      throw error;
    }
  }
}

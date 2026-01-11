import { Logger } from "../utils/Logger";
import { InvalidSummaryError } from "../models/Wikipedia";
import {
  sanitizeForOverlay,
  validatePlainText,
  stripFormatting,
} from "../utils/textProcessing";
import { LLMProviderFactory } from "./llm/LLMProviderFactory";
import type { LLMProvider } from "./llm/LLMProvider";
import { DatabaseService } from "./DatabaseService";

// Configuration constant
const DISABLE_LLM_SUMMARIZATION = false; // Set to true to return raw Wikipedia extract instead of LLM summary

/**
 * OllamaSummarizerService handles text summarization using configured LLM provider
 * Supports: Ollama, OpenAI, Anthropic
 */
export class OllamaSummarizerService {
  private static instance: OllamaSummarizerService;
  private logger: Logger;
  private provider: LLMProvider | null;

  private constructor() {
    this.logger = new Logger("OllamaSummarizerService");

    if (!DISABLE_LLM_SUMMARIZATION) {
      this.provider = LLMProviderFactory.createFromSettings();
      this.logger.info(`Using LLM provider: ${this.provider.getName()}`);
    } else {
      this.provider = null;
      this.logger.warn(`LLM summarization DISABLED - will return raw Wikipedia extract`);
    }
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): OllamaSummarizerService {
    if (!OllamaSummarizerService.instance) {
      OllamaSummarizerService.instance = new OllamaSummarizerService();
    }
    return OllamaSummarizerService.instance;
  }

  /**
   * Reload configuration (e.g., after settings change)
   */
  reloadConfig(): void {
    if (!DISABLE_LLM_SUMMARIZATION) {
      this.provider = LLMProviderFactory.createFromSettings();
      this.logger.info(`LLM provider reloaded: ${this.provider.getName()}`);
    }
  }

  /**
   * Summarize content into 1-5 lines, max 100 chars per line
   * If DISABLE_LLM_SUMMARIZATION is true, returns raw Wikipedia extract split into sentences
   */
  async summarize(content: string): Promise<string[]> {
    if (DISABLE_LLM_SUMMARIZATION) {
      this.logger.info(`LLM disabled - returning raw Wikipedia extract (${content.length} chars)`);
      return this.processRawExtract(content);
    }

    if (!this.provider) {
      throw new InvalidSummaryError("LLM provider not initialized");
    }

    this.logger.info(`Summarizing content (${content.length} chars) with ${this.provider.getName()}`);

    try {
      const response = await this.provider.summarize(content);
      const processedLines = this.processResponse(response);

      this.logger.info(`Summary completed: ${processedLines.length} lines`);
      return processedLines;
    } catch (error) {
      this.logger.error("Summarization failed:", error);
      throw new InvalidSummaryError(
        `Failed to summarize: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Process raw Wikipedia extract when LLM is disabled
   * Split into sentences and return first 5 (complete, not truncated)
   */
  private processRawExtract(content: string): string[] {
    // Split into sentences
    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Take first 5 sentences (keep them complete, don't truncate)
    const selectedSentences = sentences.slice(0, 5);

    if (selectedSentences.length === 0) {
      throw new InvalidSummaryError("No valid sentences in Wikipedia extract");
    }

    // Sanitize for overlay display (this will encode HTML entities but won't truncate)
    return sanitizeForOverlay(selectedSentences);
  }

  /**
   * Process LLM response: validate, clean, enforce limits
   */
  private processResponse(response: string): string[] {
    if (!response || response.trim().length === 0) {
      throw new InvalidSummaryError("LLM returned empty response");
    }

    let processed = response.trim();

    // Check if output contains forbidden formatting
    if (!validatePlainText(processed)) {
      this.logger.warn("LLM output contains formatting, stripping...");
      processed = stripFormatting(processed);
    }

    // Split into sentences (complete sentences ending with punctuation)
    const sentences = processed
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);

    // Take only complete sentences that fit reasonably
    // Target: ~100 chars max per sentence, but accept up to 110 for complete sentences
    const selectedSentences: string[] = [];

    for (const sentence of sentences) {
      // Skip sentences that are way too long (over 110 chars)
      if (sentence.length > 110) {
        this.logger.warn(`Skipping too long sentence: ${sentence.length} chars`);
        continue;
      }

      selectedSentences.push(sentence);

      // Stop at 5 sentences max
      if (selectedSentences.length >= 5) {
        break;
      }
    }

    // If we don't have enough sentences, try to use what we have
    if (selectedSentences.length === 0) {
      throw new InvalidSummaryError("No valid sentences after filtering");
    }

    // Each sentence becomes one line
    const lines = selectedSentences;

    // Sanitize for overlay display
    const sanitized = sanitizeForOverlay(lines);

    // Final validation
    if (sanitized.length === 0 || sanitized.length > 5) {
      throw new InvalidSummaryError(
        `Invalid summary: got ${sanitized.length} lines, expected 1-5`
      );
    }

    return sanitized;
  }

  /**
   * Test LLM provider connectivity
   */
  async testConnection(): Promise<{ success: boolean; error?: string; provider?: string }> {
    if (DISABLE_LLM_SUMMARIZATION || !this.provider) {
      return {
        success: true,
        provider: "Disabled (raw extract mode)",
      };
    }

    try {
      const result = await this.provider.testConnection();
      return {
        ...result,
        provider: this.provider.getName(),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        provider: this.provider.getName(),
      };
    }
  }

  /**
   * Get available models for current provider
   */
  async getAvailableModels(): Promise<string[]> {
    if (DISABLE_LLM_SUMMARIZATION || !this.provider) {
      return [];
    }

    // Only Ollama supports listing models for now
    if (this.provider.getName() === "Ollama") {
      try {
        const db = DatabaseService.getInstance();
        const url = db.getSetting("ollama_url") || "http://localhost:11434";

        const response = await fetch(`${url}/api/tags`, {
          signal: AbortSignal.timeout(5000),
        });

        if (response.ok) {
          const data = await response.json();
          return data.models?.map((m: { name: string }) => m.name) || [];
        }
      } catch (error) {
        this.logger.error("Failed to fetch Ollama models:", error);
      }
    }

    // Return default models for other providers
    if (this.provider.getName() === "OpenAI") {
      return [
        "gpt-5-mini",      // Most cost-effective & fast
        "gpt-5.2",         // Balanced quality/price
        "gpt-4o-mini",     // Previous gen (fallback)
        "gpt-4o",          // Previous gen high quality
      ];
    }

    if (this.provider.getName().includes("Anthropic")) {
      return [
        "claude-3-5-haiku-20241022",  // Fast & cheap
        "claude-3-5-sonnet-20241022", // Balanced (recommended)
        "claude-3-opus-20240229",     // Best quality
      ];
    }

    return [];
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    if (DISABLE_LLM_SUMMARIZATION || !this.provider) {
      return "Disabled (raw extract mode)";
    }
    return this.provider.getName();
  }

  /**
   * Get current configuration info
   */
  getConfig(): { url: string; model: string; num_ctx: number } {
    const db = DatabaseService.getInstance();
    const providerType = db.getSetting("llm_provider") || "ollama";

    if (providerType === "ollama") {
      return {
        url: db.getSetting("ollama_url") || "http://localhost:11434",
        model: db.getSetting("ollama_model") || "qwen2.5:3b",
        num_ctx: parseInt(db.getSetting("ollama_num_ctx") || "8192", 10),
      };
    }

    // For other providers, return placeholder config
    return {
      url: providerType,
      model: db.getSetting(`${providerType}_model`) || "default",
      num_ctx: 0,
    };
  }
}

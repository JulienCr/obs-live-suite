/**
 * LLM Provider interface for text summarization
 * Supports multiple backends: Ollama, OpenAI, Anthropic
 */

export enum LLMProviderType {
  OLLAMA = "ollama",
  OPENAI = "openai",
  ANTHROPIC = "anthropic",
}

export interface LLMConfig {
  provider: LLMProviderType;
  
  // Ollama specific
  ollamaUrl?: string;
  ollamaModel?: string;
  
  // OpenAI specific
  openaiApiKey?: string;
  openaiModel?: string;
  
  // Anthropic specific
  anthropicApiKey?: string;
  anthropicModel?: string;
  
  // Common
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface LLMProvider {
  /**
   * Summarize content into 3-5 short sentences
   */
  summarize(content: string): Promise<string>;
  
  /**
   * Test provider connectivity
   */
  testConnection(): Promise<{ success: boolean; error?: string }>;
  
  /**
   * Get provider name
   */
  getName(): string;
}



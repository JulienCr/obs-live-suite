import { DatabaseService } from "@/lib/services/DatabaseService";
import { OllamaSummarizerService } from "@/lib/services/OllamaSummarizerService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";
import { LLM_URLS } from "@/lib/config/Constants";

const LOG_CONTEXT = "[SettingsAPI:integrations]";

/**
 * GET /api/settings/integrations
 * Get all LLM integration settings
 */
export const GET = withSimpleErrorHandler(async () => {
  const db = DatabaseService.getInstance();

  const settings = {
    llm_provider: db.getSetting("llm_provider") || "ollama",

    // Ollama
    ollama_url: db.getSetting("ollama_url") || LLM_URLS.OLLAMA_DEFAULT,
    ollama_model: db.getSetting("ollama_model") || "mistral:latest",

    // OpenAI
    openai_api_key: db.getSetting("openai_api_key") || "",
    openai_model: db.getSetting("openai_model") || "gpt-5-mini",

    // Anthropic
    anthropic_api_key: db.getSetting("anthropic_api_key") || "",
    anthropic_model: db.getSetting("anthropic_model") || "claude-3-5-sonnet-20241022",
  };

  return ApiResponses.ok({ settings });
}, LOG_CONTEXT);

/**
 * POST /api/settings/integrations
 * Save LLM integration settings
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const db = DatabaseService.getInstance();

  // Save each setting if provided
  const settingsToSave: Record<string, string> = {};

  if (body.llm_provider !== undefined) {
    settingsToSave.llm_provider = body.llm_provider;
  }

  // Ollama
  if (body.ollama_url !== undefined) {
    settingsToSave.ollama_url = body.ollama_url;
  }
  if (body.ollama_model !== undefined) {
    settingsToSave.ollama_model = body.ollama_model;
  }

  // OpenAI
  if (body.openai_api_key !== undefined) {
    settingsToSave.openai_api_key = body.openai_api_key;
  }
  if (body.openai_model !== undefined) {
    settingsToSave.openai_model = body.openai_model;
  }

  // Anthropic
  if (body.anthropic_api_key !== undefined) {
    settingsToSave.anthropic_api_key = body.anthropic_api_key;
  }
  if (body.anthropic_model !== undefined) {
    settingsToSave.anthropic_model = body.anthropic_model;
  }

  // Save all settings
  for (const [key, value] of Object.entries(settingsToSave)) {
    db.setSetting(key, value);
  }

  // Reload the summarizer service to pick up new settings
  const summarizer = OllamaSummarizerService.getInstance();
  summarizer.reloadConfig();

  return ApiResponses.ok({
    success: true,
    message: "Integration settings saved successfully",
  });
}, LOG_CONTEXT);

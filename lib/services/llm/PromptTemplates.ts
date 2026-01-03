/**
 * Centralized LLM prompt templates for consistent behavior across providers.
 *
 * These templates are designed for French-language overlays in a live TV/streaming
 * production environment. Each prompt is optimized for concise, screen-friendly output.
 */

/**
 * System message for summarization tasks.
 * Used by providers that support system messages (OpenAI, Anthropic).
 */
export const SUMMARIZATION_SYSTEM_MESSAGE =
  "Tu es un assistant qui résume des textes de manière concise pour des overlays TV.";

/**
 * Builds a summarization prompt for overlay display.
 *
 * Constraints:
 * - Output exactly 3-5 lines
 * - Minimal markdown allowed
 * - Maximum 100 characters per line
 * - No numbering or bullet points
 * - No introduction or warnings
 *
 * @param content - The text content to summarize
 * @returns The formatted prompt string
 */
export function buildSummarizationPrompt(content: string): string {
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

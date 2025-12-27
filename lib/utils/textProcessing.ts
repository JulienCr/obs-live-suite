import { InvalidSummaryError } from "../models/Wikipedia";

/**
 * Decode HTML entities to their corresponding characters
 */
export function decodeHTMLEntities(text: string): string {
  let decoded = text;

  // Decode common HTML entities
  decoded = decoded.replace(/&lt;/g, '<');
  decoded = decoded.replace(/&gt;/g, '>');
  decoded = decoded.replace(/&quot;/g, '"');
  decoded = decoded.replace(/&#39;/g, "'");
  decoded = decoded.replace(/&apos;/g, "'");
  decoded = decoded.replace(/&nbsp;/g, ' ');
  
  // Decode numeric entities (decimal)
  decoded = decoded.replace(/&#(\d+);/g, (match, dec) => {
    return String.fromCharCode(parseInt(dec, 10));
  });
  
  // Decode numeric entities (hexadecimal)
  decoded = decoded.replace(/&#x([0-9A-Fa-f]+);/g, (match, hex) => {
    return String.fromCharCode(parseInt(hex, 16));
  });
  
  // Decode &amp; last to avoid conflicts
  decoded = decoded.replace(/&amp;/g, '&');

  return decoded;
}

/**
 * Enforce line limits for overlay text
 * - Max 5 lines
 * - Max ~100 chars per line (flexible to keep sentences complete)
 * - NO ellipsis - keeps sentences complete
 */
export function enforceLineLimits(text: string): string[] {
  if (!text || text.trim().length === 0) {
    throw new InvalidSummaryError("Text is empty after processing");
  }

  // Split by newlines and filter empty lines
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    throw new InvalidSummaryError("No non-empty lines after processing");
  }

  // Take first 5 lines - they should already be properly formatted
  // by the sentence-aware processing in OllamaSummarizerService
  return lines.slice(0, 5);
}

/**
 * Sanitize text for overlay display
 * - Remove special chars that break rendering
 * - Decode HTML entities (React will handle escaping automatically)
 * - Normalize quotes and apostrophes
 */
export function sanitizeForOverlay(lines: string[]): string[] {
  return lines.map((line) => {
    let sanitized = line;

    // Decode any existing HTML entities (from Wikipedia or LLM output)
    sanitized = decodeHTMLEntities(sanitized);

    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, "");

    // Normalize quotes and apostrophes to standard characters
    sanitized = sanitized.replace(/['']/g, "'");
    sanitized = sanitized.replace(/[""]/g, '"');

    // Remove zero-width spaces and other invisible chars
    sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, "");

    // DON'T re-encode HTML entities - React/ReactMarkdown handles escaping automatically
    // This prevents double-encoding issues (&#39; displayed literally instead of as ')

    return sanitized.trim();
  });
}

/**
 * Clean Wikipedia content before sending to LLM
 * - Strip citations
 * - Remove special chars that could cause injection
 * - Normalize whitespace
 * - Truncate to max length
 */
export function cleanWikipediaContent(
  content: string,
  maxLength: number = 800
): string {
  let cleaned = content;

  // Remove wikitext patterns (defense-in-depth for edge cases)
  cleaned = cleaned.replace(/smaller\|/g, ''); // Template fragments like "smaller|"
  cleaned = cleaned.replace(/\{\{[^}]+\}\}/g, ''); // Templates {{...}}
  cleaned = cleaned.replace(/\[\[Fichier:[^\]]+\]\]/g, ''); // [[Fichier:...]] (images)
  cleaned = cleaned.replace(/\[\[File:[^\]]+\]\]/g, ''); // [[File:...]] (images)
  cleaned = cleaned.replace(/\[\[([^|\]]+)\|([^|\]]+)\]\]/g, '$2'); // [[link|text]] -> text
  cleaned = cleaned.replace(/\[\[([^|\]]+)\]\]/g, '$1'); // [[link]] -> link

  // Remove citations [1], [citation needed], etc.
  cleaned = cleaned.replace(/\[[\d\s,]+\]/g, "");
  cleaned = cleaned.replace(/\[citation needed\]/gi, "");
  cleaned = cleaned.replace(/\[clarification needed\]/gi, "");

  // Remove parenthetical pronunciations (IPA, etc.)
  cleaned = cleaned.replace(/\([^)]*IPA[^)]*\)/gi, "");

  // Decode HTML entities that might remain
  cleaned = cleaned.replace(/&lt;/g, '<');
  cleaned = cleaned.replace(/&gt;/g, '>');
  cleaned = cleaned.replace(/&amp;/g, '&');
  cleaned = cleaned.replace(/&quot;/g, '"');
  cleaned = cleaned.replace(/&#39;/g, "'");
  cleaned = cleaned.replace(/&apos;/g, "'");

  // Remove HTML tags and attributes
  cleaned = cleaned.replace(/<[^>]*>/g, "");

  // Remove curly braces and angle brackets (potential injection vectors)
  cleaned = cleaned.replace(/[{}]/g, "");
  cleaned = cleaned.replace(/[<>]/g, "");

  // Normalize whitespace
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  // Truncate to max length
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
    // Try to cut at sentence boundary
    const lastPeriod = cleaned.lastIndexOf(".");
    const lastExclamation = cleaned.lastIndexOf("!");
    const lastQuestion = cleaned.lastIndexOf("?");
    const lastSentence = Math.max(lastPeriod, lastExclamation, lastQuestion);

    if (lastSentence > maxLength * 0.7) {
      // If we found a sentence end in the last 30%, use it
      cleaned = cleaned.substring(0, lastSentence + 1);
    }
  }

  return cleaned;
}

/**
 * Validate that LLM output doesn't contain forbidden formatting
 * Returns true if output is valid (plain text only)
 */
export function validatePlainText(text: string): boolean {
  // Check for markdown bullets
  if (/^[-*•]\s/m.test(text)) {
    return false;
  }

  // Check for markdown headers
  if (/^#+\s/m.test(text)) {
    return false;
  }

  // Check for markdown bold/italic
  if (/\*\*|\*|__/. test(text)) {
    return false;
  }

  // Check for HTML tags
  if (/<[^>]+>/. test(text)) {
    return false;
  }

  return true;
}

/**
 * Strip markdown and formatting from text
 */
export function stripFormatting(text: string): string {
  let stripped = text;

  // Remove markdown bullets
  stripped = stripped.replace(/^[-*•]\s+/gm, "");

  // Remove markdown headers
  stripped = stripped.replace(/^#+\s+/gm, "");

  // Remove markdown bold/italic
  stripped = stripped.replace(/\*\*([^*]+)\*\*/g, "$1");
  stripped = stripped.replace(/\*([^*]+)\*/g, "$1");
  stripped = stripped.replace(/__([^_]+)__/g, "$1");
  stripped = stripped.replace(/_([^_]+)_/g, "$1");

  // Remove HTML tags
  stripped = stripped.replace(/<[^>]*>/g, "");

  return stripped;
}


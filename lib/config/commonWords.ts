import { FRENCH_COMMON_WORDS } from "./frenchCommonWords";
import { ENGLISH_COMMON_WORDS } from "./englishCommonWords";

/**
 * Is this normalized token a GENERAL word — a common French or English word, or a bare
 * number — rather than a SPECIFIC one (a proper noun / made-up show name)?
 *
 * The Live Assist local-poster fast-path uses this as its precision gate: a general word
 * ("féminin", "design", "network", "2026") can't fire a poster on its own — it needs a
 * show-domain keyword in context or a 2nd matching token. A specific token ("Eclypsia",
 * "Casseroles", "Blackout", "Emeline") fires alone. Frequency alone can't separate these
 * (show titles reuse common words, and names appear in subtitle frequency lists), so we gate
 * on dictionary-style membership of the most common ~12.9k French + ~8.2k English words.
 *
 * Tokens are expected pre-normalized (lowercase, accent-stripped) — same `norm()` as the lists.
 */
export function isGeneralWord(token: string): boolean {
  return /^[0-9]+$/.test(token) || FRENCH_COMMON_WORDS.has(token) || ENGLISH_COMMON_WORDS.has(token);
}

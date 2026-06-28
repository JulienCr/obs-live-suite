// lib/services/liveassist/hallucinationFilter.ts
import { LIVE_ASSIST } from "@/lib/config/Constants";
import { norm } from "./KeywordDetector";

// Pre-normalize the phrase blocklist once at module load. `norm` lowercases, strips
// accents, and folds apostrophe variants — the same normalization the KeywordDetector
// uses — so the list can be stored as readable French/English in Constants.
const NORM_PHRASES = new Set(LIVE_ASSIST.HALLUCINATION_PHRASES.map(norm));

/**
 * True when a finalized STT segment is a known Whisper "silence hallucination":
 * subtitle credits / boilerplate the model emits during non-speech (it was trained
 * on YouTube/TV subtitles). Two layers, both on the normalized text with surrounding
 * punctuation/quotes stripped (so "Merci." == "merci", "« … »" == "…"):
 *   - exact match against LIVE_ASSIST.HALLUCINATION_PHRASES, and
 *   - regex families in LIVE_ASSIST.HALLUCINATION_PATTERNS (e.g. the "Sous-titrage …"
 *     family where a station/number/year varies).
 *
 * Exact-match (not substring) for the phrase list keeps false positives near zero:
 * "Abonnez-vous" is dropped, but "abonnez-vous à la newsletter" is real speech and kept.
 */
export function isHallucination(text: string): boolean {
  const t = norm(text)
    .replace(/^[\s"'«».,!?…–—-]+|[\s"'«».,!?…–—-]+$/g, "")
    .trim();
  if (!t) return false; // empty / punctuation-only carries no signal — not flagged
  if (NORM_PHRASES.has(t)) return true;
  return LIVE_ASSIST.HALLUCINATION_PATTERNS.some((re) => re.test(t));
}

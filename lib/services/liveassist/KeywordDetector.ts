import type { TranscriptSegment } from "@/lib/models/LiveAssist";

export type KeywordHit = { providerId: string; keyword: string; tHit: number };

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    // Fold apostrophe variants to ASCII ': faster-whisper emits the typographic
    // ’ (U+2019) but keywords like "c'est quoi" use ASCII ' (U+0027).
    .replace(/[’‘ʼ´`]/g, "'");

/** Escapes regex special chars in a literal keyword. */
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class KeywordDetector {
  private entries: { providerId: string; keyword: string; re: RegExp }[] = [];

  constructor(keywordsByProvider: Record<string, string[]>) {
    this.setKeywords(keywordsByProvider);
  }

  /** Rebuilds the matcher from a new keyword map (live Settings reload). */
  setKeywords(keywordsByProvider: Record<string, string[]>): void {
    const entries: typeof this.entries = [];
    for (const [providerId, keywords] of Object.entries(keywordsByProvider)) {
      for (const keyword of keywords) {
        // Whole-word match on normalized text (no accents). \b is unreliable
        // around apostrophes, so we anchor on non-letter boundaries.
        entries.push({
          providerId,
          keyword,
          re: new RegExp(`(^|[^a-z0-9])${escape(norm(keyword))}([^a-z0-9]|$)`, "i"),
        });
      }
    }
    this.entries = entries;
  }

  scan(segment: TranscriptSegment): KeywordHit[] {
    const text = norm(segment.text);
    const hits: KeywordHit[] = [];
    for (const { providerId, keyword, re } of this.entries) {
      if (re.test(text)) hits.push({ providerId, keyword, tHit: segment.t0 });
    }
    return hits;
  }
}

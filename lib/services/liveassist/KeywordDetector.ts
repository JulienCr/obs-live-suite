import type { TranscriptSegment } from "@/lib/models/LiveAssist";

export type KeywordHit = { providerId: string; keyword: string; tHit: number };

const norm = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Escapes regex special chars in a literal keyword. */
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export class KeywordDetector {
  private readonly entries: { providerId: string; keyword: string; re: RegExp }[] = [];

  constructor(keywordsByProvider: Record<string, string[]>) {
    for (const [providerId, keywords] of Object.entries(keywordsByProvider)) {
      for (const keyword of keywords) {
        // Whole-word match on normalized text (no accents). \b is unreliable
        // around apostrophes, so we anchor on non-letter boundaries.
        this.entries.push({
          providerId,
          keyword,
          re: new RegExp(`(^|[^a-z0-9])${escape(norm(keyword))}([^a-z0-9]|$)`, "i"),
        });
      }
    }
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

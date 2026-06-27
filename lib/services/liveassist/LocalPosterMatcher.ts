import { norm } from "./KeywordDetector";
import { similarity } from "@/lib/utils/fuzzyMatch";
import { LIVE_ASSIST } from "@/lib/config/Constants";

/** Minimal poster shape the matcher needs (decoupled from the DB row). */
export interface MatchablePoster {
  id: string;
  title: string;
  fileUrl: string;
  type: string;
  thumbnailUrl?: string | null;
  // Sub-video clip fields, forwarded into the show payload so a matched video clip
  // honors its saved range/chapters instead of playing the raw file from the start
  // (parity with the dashboard PosterCard show path). A raw Poster row satisfies these.
  startTime?: number | null;
  endTime?: number | null;
  endBehavior?: "stop" | "loop" | null;
  metadata?: Record<string, unknown> | null;
}

export interface PosterMatch {
  poster: MatchablePoster;
  score: number;
}

const STOPWORDS = new Set(LIVE_ASSIST.LOCAL_POSTER_STOPWORDS_FR);

/** Split already-normalized text into alphanumeric tokens. */
function tokenize(normalized: string): string[] {
  return normalized.split(/[^a-z0-9]+/).filter(Boolean);
}

/** Distinctive title tokens eligible to trigger a match (long enough, not a stop-word). */
function triggerTokens(title: string): string[] {
  return tokenize(norm(title)).filter(
    (t) => t.length >= LIVE_ASSIST.LOCAL_POSTER_MIN_TOKEN_LEN && !STOPWORDS.has(t),
  );
}

/**
 * Fuzzy-matches transcript text against the titles of existing posters, so the
 * Live Assist fast-path can suggest a poster the host just named — without the LLM.
 *
 * Matching is token-level: each distinctive word of a poster title is compared
 * (Levenshtein similarity) against each spoken word. A poster matches on its best
 * token/word pair clearing `minSimilarity`. Titles whose only tokens are short or
 * stop-words (e.g. "Le Roi") cannot trigger.
 */
export class LocalPosterMatcher {
  private index: { poster: MatchablePoster; tokens: string[] }[] = [];
  private minSimilarity: number = LIVE_ASSIST.LOCAL_POSTER_MIN_SIMILARITY;
  private readonly maxMatches = 3;

  /** Rebuild the index from the current posters (live refresh). */
  setPosters(posters: MatchablePoster[], minSimilarity: number = LIVE_ASSIST.LOCAL_POSTER_MIN_SIMILARITY): void {
    this.minSimilarity = minSimilarity;
    this.index = posters
      .map((poster) => ({ poster, tokens: triggerTokens(poster.title) }))
      .filter((e) => e.tokens.length > 0);
  }

  /** Best fuzzy poster matches for a transcript segment — one entry per poster, best score first. */
  match(text: string): PosterMatch[] {
    const words = tokenize(norm(text));
    if (words.length === 0) return [];

    const matches: PosterMatch[] = [];
    for (const { poster, tokens } of this.index) {
      let best = 0;
      outer: for (const token of tokens) {
        for (const word of words) {
          // Cheap upper bound: similarity ≤ 1 − |Δlen|/maxLen (since Levenshtein ≥ |Δlen|).
          // Skip the O(len²) edit-distance DP whenever the lengths alone can't clear the bar.
          const maxLen = Math.max(token.length, word.length);
          if (1 - Math.abs(token.length - word.length) / maxLen < this.minSimilarity) continue;
          const s = similarity(token, word);
          if (s > best) {
            best = s;
            if (best >= 1) break outer; // exact match — no pair can beat it
          }
        }
      }
      if (best >= this.minSimilarity) matches.push({ poster, score: best });
    }
    return matches.sort((a, b) => b.score - a.score).slice(0, this.maxMatches);
  }
}

import { norm } from "./KeywordDetector";
import { similarity } from "@/lib/utils/fuzzyMatch";
import { LIVE_ASSIST } from "@/lib/config/Constants";
import { isGeneralWord } from "@/lib/config/commonWords";

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

/** Why a poster was admitted — surfaced for the explainable log / shadow mode.
 *  - `distinctive`: a rare (non-everyday) token matched → fires alone.
 *  - `context`: an everyday-word token matched AND a show-domain keyword was in context.
 *  - `corroboration`: ≥2 title tokens matched. */
export type MatchRule = "distinctive" | "context" | "corroboration";

export interface PosterMatch {
  poster: MatchablePoster;
  score: number;
  /** The title trigger token that best explains the fire (e.g. "eclypsia"). */
  matchedToken: string;
  /** The spoken word it matched (e.g. "eclipsia"). */
  matchedWord: string;
  rule: MatchRule;
}

const STOPWORDS = new Set(LIVE_ASSIST.LOCAL_POSTER_STOPWORDS_FR);

/** Best spoken-word hit for a single title token. */
interface TokenHit {
  token: string;
  word: string;
  score: number;
}

/** Split already-normalized text into alphanumeric tokens. */
function tokenize(normalized: string): string[] {
  return normalized.split(/[^a-z0-9]+/).filter(Boolean);
}

/** Distinctive title tokens eligible to trigger a match (long enough, not a stop-word).
 *  DISTINCT — a title that repeats a word ("Bla Bla") must count it once, else `idTokenCount`
 *  and the matched-hit count both inflate and break the mono-identity / corroboration gates. */
function triggerTokens(title: string): string[] {
  return [
    ...new Set(
      tokenize(norm(title)).filter(
        (t) => t.length >= LIVE_ASSIST.LOCAL_POSTER_MIN_TOKEN_LEN && !STOPWORDS.has(t),
      ),
    ),
  ];
}

/**
 * Fuzzy-matches transcript text against the titles of existing posters, so the
 * Live Assist fast-path can suggest a poster the host just named — without the LLM.
 *
 * Matching is evidence-based, to keep the fast-path precise (it fires instantly, with
 * no LLM/window/human in the loop until the card is validated):
 *
 *  1. **Length-aware fuzz.** A title token of `≤ LOCAL_POSTER_FUZZY_MIN_LEN` chars must
 *     match a spoken word EXACTLY; only longer tokens tolerate Levenshtein typos (≥ the
 *     `minSimilarity` bar). This removes the 1-edit-on-a-5-char-word collisions that
 *     fired on everyday speech (spoken "ferme" ≈ the title token "femme" at 0.80).
 *  2. **Domain words are context, not identity.** A matched token that is itself a show-domain
 *     keyword ("impro", "film") is dropped from the fire decision — "l'impro" must not light
 *     up every impro-titled poster. It still counts toward the `context` signal.
 *  3. **Distinctiveness, context, or corroboration** (on the remaining IDENTITY tokens):
 *     - distinctive: a matched token fires alone only if it is SPECIFIC (`!isGeneralWord` — not a
 *       common French/English word or bare number) AND title-unique (in exactly one indexed title).
 *       Proper nouns / made-up names ("Eclypsia", "Casseroles", "Blackout") fire; general words
 *       ("féminin", "design", "network", "2026") never do, even if a frequency list once missed one.
 *       A token shared by ≥2 titles ("thierry" across 4 variants) is ambiguous → needs corroboration.
 *     - context: a MONO-identity general-word title ("Pilote", "Le Prime" — one identity token)
 *       fires when a show-domain keyword is in the recent transcript context. Multi-token
 *       titles can't fire on one general word ("petite" alone never fires "La Petite Maison
 *       dans la prairie").
 *     - corroboration: ≥2 identity tokens of the same title match.
 *     Everything else falls back to the keyword/LLM path.
 */
export class LocalPosterMatcher {
  private index: { poster: MatchablePoster; tokens: string[] }[] = [];
  private minSimilarity: number = LIVE_ASSIST.LOCAL_POSTER_MIN_SIMILARITY;
  private domainTokens: Set<string> = new Set(
    LIVE_ASSIST.LOCAL_POSTER_DOMAIN_KEYWORDS.flatMap((k) => tokenize(norm(k))),
  );
  /** How many distinct indexed titles each trigger token appears in. A token in ≥2 titles is
   *  "ambiguous" (e.g. "thierry" across 4 Thierry-variant posters): it identifies no single
   *  poster, so it can't fire one on its own — only a title-unique token (or corroboration) can. */
  private tokenTitleCount: Map<string, number> = new Map();
  private readonly maxMatches = LIVE_ASSIST.LOCAL_POSTER_MAX_MATCHES;

  /** Rebuild the index from the current posters (live refresh). */
  setPosters(posters: MatchablePoster[], minSimilarity: number = LIVE_ASSIST.LOCAL_POSTER_MIN_SIMILARITY): void {
    this.minSimilarity = minSimilarity;
    this.index = posters
      .map((poster) => ({ poster, tokens: triggerTokens(poster.title) }))
      .filter((e) => e.tokens.length > 0);
    const counts = new Map<string, number>();
    for (const { tokens } of this.index) {
      for (const t of new Set(tokens)) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    this.tokenTitleCount = counts;
  }

  /** Set the show-domain keywords that enable the `context` rule (live Settings refresh). */
  setDomainKeywords(keywords: string[]): void {
    this.domainTokens = new Set(keywords.flatMap((k) => tokenize(norm(k))));
  }

  /** Best matching spoken word for one title token, or null if none clears the gate. */
  private bestHit(token: string, words: string[]): TokenHit | null {
    // Short tokens demand an exact match — fuzz on 4–6 char words is the main false-positive source.
    if (token.length <= LIVE_ASSIST.LOCAL_POSTER_FUZZY_MIN_LEN) {
      return words.includes(token) ? { token, word: token, score: 1 } : null;
    }
    let best: TokenHit | null = null;
    for (const word of words) {
      // Cheap upper bound: similarity ≤ 1 − |Δlen|/maxLen (Levenshtein ≥ |Δlen|).
      // Skip the O(len²) edit-distance DP whenever the lengths alone can't clear the bar.
      const maxLen = Math.max(token.length, word.length);
      if (1 - Math.abs(token.length - word.length) / maxLen < this.minSimilarity) continue;
      const s = similarity(token, word);
      if (s >= this.minSimilarity && (!best || s > best.score)) {
        best = { token, word, score: s };
        if (s >= 1) break; // exact — no pair can beat it
      }
    }
    return best;
  }

  /**
   * Best fuzzy poster matches for a transcript segment — one entry per poster, best score
   * first. `text` is the segment whose words are matched against title tokens; `contextText`
   * is the recent look-back window scanned for show-domain keywords (defaults to `text` when
   * the caller has no wider context, e.g. the unit tests / a single-segment call).
   */
  match(text: string, contextText?: string): PosterMatch[] {
    const words = tokenize(norm(text));
    if (words.length === 0) return [];

    // A show-domain keyword anywhere in the recent context enables the `context` rule.
    const contextWords = tokenize(norm(contextText ?? text));
    const domainPresent = contextWords.some((w) => this.domainTokens.has(w));

    const matches: PosterMatch[] = [];
    for (const { poster, tokens } of this.index) {
      const hits: TokenHit[] = [];
      for (const token of tokens) {
        const hit = this.bestHit(token, words);
        if (hit) hits.push(hit);
      }

      // A matched token that is itself a show-domain keyword ("impro", "film") is a CATEGORY
      // word, not a title identity: it never fires a poster on its own (the host saying
      // "l'impro" must not light up every impro-titled poster). Domain words still feed the
      // `context` signal via contextWords above; here they're dropped from the fire decision.
      const idHits = hits.filter((h) => !this.domainTokens.has(h.token));
      if (idHits.length === 0) continue;
      // Count the title's real IDENTITY tokens (trigger tokens minus domain words). The
      // `context` rule is limited to mono-identity titles ("Pilote") — a long multi-token
      // title ("La Petite Maison dans la prairie") must NOT fire on one everyday word ("petite").
      const idTokenCount = tokens.filter((t) => !this.domainTokens.has(t)).length;

      // A single token fires a poster only if it's title-UNIQUE (in exactly one indexed
      // title). An ambiguous token shared by ≥2 titles ("thierry" across 4 Thierry variants)
      // identifies no single poster — it can only contribute to corroboration.
      const uniqueHits = idHits.filter((h) => (this.tokenTitleCount.get(h.token) ?? 1) === 1);

      // Evidence gate (precedence: distinctive → context → corroboration):
      //  - distinctive: a unique token that's SPECIFIC (not a common FR/EN word or number) fires alone;
      //  - context: a mono-identity general-word title fires on its unique token when a domain
      //    keyword is in context;
      //  - corroboration: ≥2 identity tokens of the same title match.
      const distinctive = uniqueHits.filter((h) => !isGeneralWord(h.token));
      let chosen: TokenHit | null = null;
      let rule: MatchRule | null = null;
      if (distinctive.length) {
        chosen = distinctive.reduce((a, b) => (b.score > a.score ? b : a));
        rule = "distinctive";
      } else if (domainPresent && idTokenCount === 1 && uniqueHits.length) {
        chosen = uniqueHits.reduce((a, b) => (b.score > a.score ? b : a));
        rule = "context";
      } else if (idHits.length >= 2) {
        chosen = idHits.reduce((a, b) => (b.score > a.score ? b : a));
        rule = "corroboration";
      }
      if (!chosen || !rule) continue;

      matches.push({ poster, score: chosen.score, matchedToken: chosen.token, matchedWord: chosen.word, rule });
    }
    return matches.sort((a, b) => b.score - a.score).slice(0, this.maxMatches);
  }
}

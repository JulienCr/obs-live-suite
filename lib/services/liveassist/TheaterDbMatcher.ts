import { norm } from "./KeywordDetector";
import { similarity } from "@/lib/utils/fuzzyMatch";
import { LIVE_ASSIST, THEATER_DATA } from "@/lib/config/Constants";
import { isGeneralWord } from "@/lib/config/commonWords";
import type { TheatreCandidate } from "@/lib/services/TheaterDataResolverService";

/** Injectable search — the resolver's `search(query, limit)` in prod, a stub in tests. */
export type TheaterDbSearchFn = (query: string, limit: number) => Promise<TheatreCandidate[]>;

export interface TheaterDbMatch {
  candidate: TheatreCandidate;
  /** The title token that best explains the fire (e.g. "richard"). */
  matchedToken: string;
  /** The spoken query term it matched. */
  matchedWord: string;
  score: number;
}

/** Grammatical (function) words stripped from the announced title phrase — articles,
 *  prepositions, common auxiliaries. Deliberately SMALL and grammatical only: unlike the big
 *  spaCy stopword list, it keeps content words that are real title words ("retour", "vie",
 *  "monde"), which the AND-based FTS needs to pinpoint the show. Normalized form (norm()). */
const FUNCTION_WORDS = new Set([
  "le", "la", "les", "un", "une", "de", "des", "du", "au", "aux", "et", "ou", "en",
  "dans", "sur", "sous", "avec", "pour", "par", "ce", "cet", "cette", "ces", "mon", "ma",
  "mes", "ton", "ta", "tes", "son", "sa", "ses", "notre", "nos", "votre", "vos", "leur",
  "leurs", "est", "sont", "etait", "qui", "que", "dont", "ne", "pas", "plus", "il", "elle",
  "ils", "elles", "on", "nous", "vous", "je", "tu", "se", "ca", "cela", "mais", "donc",
  "car", "ni", "or", "appelle", "nomme", "intitule",
]);

/** Cap the AND query length so a long context never over-constrains the FTS to zero rows. */
const MAX_QUERY_TERMS = 6;

/** Hard cap on the announced-title span (words after the domain word) before term-trimming. */
const MAX_TITLE_SPAN = 8;

/** When NO show title matches but the query is a proper NAME (a performer/author found via the
 *  cast/accroche index), how many top FTS hits to propose. Kept small — name matches are noisier
 *  than title matches, so we surface only the most relevant. */
const FALLBACK_MAX_MATCHES = 1;

/**
 * Words that END the announced title and START commentary — so we don't send the whole
 * sentence to the (AND-based) FTS. The title is only the run of words BETWEEN the domain word
 * and the first of these: interjections/fillers, sentence conjunctions, personal pronouns, and
 * common opinion verbs. Deliberately EXCLUDES title-internal connectors (le/de/et/ou — those are
 * FUNCTION_WORDS, dropped from the query but not a boundary) and relative pronouns / demonstratives
 * (que/qui/ce — which occur inside real titles: "Ce que le jour doit à la nuit"). Normalized form.
 */
const BOUNDARY_WORDS = new Set([
  // interjections / fillers
  "ah", "oh", "euh", "eh", "ben", "bah", "ouais", "ouah", "hein", "bon", "bref", "voila",
  "voici", "enfin", "quoi", "genre", "franchement", "vraiment", "carrement", "grave", "ok",
  "okay", "mouais", "hmm", "hein",
  // sentence conjunctions (non-title)
  "mais", "donc", "car", "puis", "alors", "quand", "lorsque", "parce", "puisque", "comme",
  "tandis", "cependant", "pourtant", "neanmoins",
  // personal pronouns starting a clause
  "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles", "moi", "toi", "lui", "eux",
  // common opinion / commentary verbs
  "crois", "pense", "trouve", "sais", "savais", "suis", "aime", "aimais", "adore", "deteste",
  "veux", "voulais", "voudrais", "faut", "dois", "devrais", "souviens", "rappelle", "imagine",
  "dirais", "pensais", "croyais",
]);

/** Split already-normalized text into alphanumeric tokens. */
function tokenize(normalized: string): string[] {
  return normalized.split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * The REMOTE sibling of {@link LocalPosterMatcher}: a NON-LLM fast-path that queries the
 * theater-data (BilletReduc) base on :4173 directly when a show title is announced on air.
 *
 * `local-poster` matches spoken words against titles ALREADY indexed locally. `theater-db`
 * handles titles NOT yet in the library by consulting the remote base — but without an LLM,
 * so it must decide WHAT to search deterministically. Two facts (verified against the live
 * base) shape the design:
 *
 *  - **Titles are announced right after a show-domain word** ("du spectacle *Le Retour de
 *    Richard*", "de la pièce *X*", "le film *Y*"). The words FOLLOWING the domain keyword are
 *    the title — a deterministic, LLM-free extraction that handles proper names and everyday
 *    words (which the distinctive-token approach wrongly filtered: "Richard" is in the common-
 *    word dictionary, "Retour" is a stop-word).
 *  - **theater-data FTS is AND-based.** `q="aimerais richard"` → `[]` (no title has "aimerais");
 *    `q="retour richard"` → the right show. So the query must be the ACTUAL title words and
 *    nothing else — hence "the phrase after the domain word", trimmed of grammatical words only.
 *
 * A **precision post-filter** then keeps a candidate only if its TITLE (not just its FTS-matched
 * accroche) contains a token that fuzzy-matches (length-aware, ≥ `minSimilarity`) a query term.
 *
 * KNOWN LIMIT — typo tolerance is a post-filter, not a retrieval strategy. The fuzzy step runs on
 * candidates the base already returned, and the query sent to theater-data is exact and AND-based.
 * So an STT misspelling inside a distinctive title ("Eclipsia" for "Eclypsia") returns no rows and
 * the fuzzy comparison never happens; only typos in a show the base surfaces anyway are absorbed.
 * Closing this needs a fuzzy/trigram search on the theater-data side, or a deliberately looser
 * query here — which would trade precision for recall on every match.
 */
export class TheaterDbMatcher {
  private minSimilarity: number = LIVE_ASSIST.LOCAL_POSTER_MIN_SIMILARITY;
  private domainTokens: Set<string> = new Set(
    LIVE_ASSIST.LOCAL_POSTER_DOMAIN_KEYWORDS.flatMap((k) => tokenize(norm(k))),
  );
  private readonly maxMatches = LIVE_ASSIST.LOCAL_POSTER_MAX_MATCHES;

  constructor(private readonly searchFn: TheaterDbSearchFn) {}

  setMinSimilarity(minSimilarity: number): void {
    this.minSimilarity = minSimilarity;
  }

  /** Set the show-domain keywords that anchor the announced title (live Settings refresh). */
  setDomainKeywords(keywords: string[]): void {
    this.domainTokens = new Set(keywords.flatMap((k) => tokenize(norm(k))));
  }

  /** The announced title = the run of words from `start` up to the first commentary boundary
   *  (or the hard cap). Title-internal connectors (le/de/et…) pass through; fillers/pronouns/
   *  opinion verbs (ah/mais/je/crois…) stop it — so we don't send the whole sentence to the FTS. */
  private titleSpan(words: string[], start: number): string[] {
    const span: string[] = [];
    let hasContent = false;
    for (let i = start; i < words.length && span.length < MAX_TITLE_SPAN; i++) {
      // A boundary word only ends the title once the span holds something searchable.
      // Titles genuinely open on these words — "le spectacle **Je suis** la maman du
      // bourreau" — and cutting there yields an empty query, so the show can never be
      // found. Waiting for a content word keeps that title whole while still stopping
      // at the commentary that follows a real one ("… Cassandre **je crois**").
      // Pure commentary costs nothing: its words are dropped by toTerms anyway.
      if (hasContent && BOUNDARY_WORDS.has(words[i])) break;
      span.push(words[i]);
      if (this.isContentWord(words[i])) hasContent = true;
    }
    return span;
  }

  /**
   * A word the FTS can actually search on: not grammatical, not too short, and not the
   * anchor that introduced the title. Only the anchor is excluded, not every domain word:
   * once a preceding anchor has fixed the title's position, a further domain token is
   * legitimate title content ("le spectacle **Impro**", "le spectacle Le **Concert**"),
   * and discarding those left nothing to query.
   */
  private isContentWord(word: string, anchor?: string): boolean {
    return word.length >= 3 && !FUNCTION_WORDS.has(word) && word !== anchor;
  }

  /** Keep only content words (drop grammatical + the anchor + very short), capped. */
  private toTerms(words: string[], anchor?: string): string[] {
    return words.filter((w) => this.isContentWord(w, anchor)).slice(0, MAX_QUERY_TERMS);
  }

  private hasDomainContext(contextText: string): boolean {
    return tokenize(norm(contextText)).some((w) => this.domainTokens.has(w));
  }

  /** Length-aware fuzzy score between a query term and a title token (0 = below the bar). */
  private fuzzyScore(spoken: string, titleToken: string): number {
    // Short title tokens demand an exact match — fuzz on 4–6 char words is the main false positive.
    if (titleToken.length <= LIVE_ASSIST.LOCAL_POSTER_FUZZY_MIN_LEN) {
      return spoken === titleToken ? 1 : 0;
    }
    const maxLen = Math.max(spoken.length, titleToken.length);
    if (1 - Math.abs(spoken.length - titleToken.length) / maxLen < this.minSimilarity) return 0;
    const s = similarity(spoken, titleToken);
    return s >= this.minSimilarity ? s : 0;
  }

  /**
   * Best theater-data matches for a transcript segment (best score first). The query is the
   * title phrase announced after a show-domain word in `text`; if `text` has no domain word but
   * one is in the recent `contextText` look-back (title spoken as its own segment), the whole
   * segment is treated as the title. Returns `[]` — with NO network call — when neither holds.
   */
  async match(text: string, contextText?: string): Promise<TheaterDbMatch[]> {
    const words = tokenize(norm(text));
    if (words.length === 0) return [];

    // The title is the phrase FOLLOWING the domain keyword ("du spectacle X"), bounded at the
    // first commentary word so we don't send the rest of the sentence to the AND-based FTS. If
    // the current segment has no domain word but the recent context does, the segment IS the title.
    // Try EVERY domain anchor, not just the first: one segment often carries an aside
    // before the announcement ("ce film est nul, mais le spectacle Cassandre"), where the
    // opening anchor yields only commentary and the real title follows a later one.
    // The first anchor producing searchable terms wins.
    const anchorIndexes = words.reduce<number[]>((acc, w, i) => {
      if (this.domainTokens.has(w)) acc.push(i);
      return acc;
    }, []);

    // The first anchor that yields anything searchable wins. Skipping barren ones matters
    // when a domain word sits INSIDE the title ("le spectacle Le Concert"): the span after
    // "concert" is empty, so it must not preempt the anchor that introduced the title.
    //
    // KNOWN LIMIT: when an aside precedes the announcement ("ce film est nul, mais le
    // spectacle Cassandre"), the first anchor yields "nul" and the real title is never
    // reached. Picking the last anchor instead just moves the miss — a title followed by
    // commentary that repeats a domain word ("de la pièce Roméo et Juliette … une super
    // pièce, je me souviens") would then search "souviens". Telling an announcing anchor
    // from a commenting one needs more than the word lists here, so the simple rule stands
    // and the case is left to the LLM window.
    let terms: string[] = [];
    let anchor: string | undefined;
    for (const index of anchorIndexes) {
      const candidateTerms = this.toTerms(this.titleSpan(words, index + 1), words[index]);
      if (candidateTerms.length > 0) {
        terms = candidateTerms;
        anchor = words[index];
        break;
      }
    }

    if (anchorIndexes.length === 0) {
      // No domain word here, but one in the recent look-back: the segment IS the title.
      if (!contextText || !this.hasDomainContext(contextText)) return [];
      terms = this.toTerms(this.titleSpan(words, 0));
    }
    if (terms.length === 0) return [];

    const candidates = await this.searchFn(terms.join(" "), THEATER_DATA.SEARCH_LIMIT);
    if (candidates.length === 0) return [];

    // Score each candidate by COVERAGE: how many DISTINCT query terms its TITLE matches. A title
    // match is strong evidence (the spoken title); it ranks a full match above a hit on one generic
    // shared word — for "retour richard", "Le retour de Richard 3" (both) beats "Retour vers la
    // rupture" (only "retour"). Coverage 0 = the query is nowhere in the title (it may still be a
    // performer/author name the FTS matched in the cast/accroche — handled by the fallback below).
    type Scored = TheaterDbMatch & { coverage: number };
    const scored: Scored[] = candidates.map((candidate) => {
      // Title tokens use the SAME light trimming as the query (grammatical words only), so real
      // title words the big stop-word list would drop ("retour") remain matchable.
      const titleTokens = [...new Set(this.toTerms(tokenize(norm(candidate.title)), anchor))];
      const matchedTerms = new Set<string>();
      let best: { token: string; word: string; score: number } | null = null;
      for (const titleToken of titleTokens) {
        for (const term of terms) {
          const score = this.fuzzyScore(term, titleToken);
          if (score > 0) {
            matchedTerms.add(term);
            if (!best || score > best.score) best = { token: titleToken, word: term, score };
          }
        }
      }
      return {
        candidate,
        matchedToken: best?.token ?? "",
        matchedWord: best?.word ?? terms.join(" "),
        score: best?.score ?? 0.7, // FTS-only (cast/accroche) match → lower confidence than a title match
        coverage: matchedTerms.size,
      };
    });

    const maxCoverage = Math.max(...scored.map((s) => s.coverage));
    let kept: Scored[];
    if (maxCoverage > 0) {
      // A title matched → keep the best-covered candidates. Precise; drops generic-word hitchhikers.
      kept = scored.filter((s) => s.coverage === maxCoverage);
    } else if (terms.some((t) => !isGeneralWord(t))) {
      // NO title matched, but the query is a PROPER NAME (≥1 specific token — "roxane michelet",
      // "cruau") → a performer/author whose name lives in the cast/accroche (theater-data indexes
      // those). Trust the FTS relevance order, capped tight. A common-word query ("génial soir" —
      // every token general) is conversation, not a show title, and correctly falls through to [].
      kept = scored.slice(0, FALLBACK_MAX_MATCHES);
    } else {
      return [];
    }
    return kept
      .sort((a, b) => b.coverage - a.coverage || b.score - a.score)
      .slice(0, this.maxMatches)
      .map((s) => ({ candidate: s.candidate, matchedToken: s.matchedToken, matchedWord: s.matchedWord, score: s.score }));
  }
}

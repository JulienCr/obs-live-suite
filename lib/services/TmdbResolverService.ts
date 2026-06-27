import { TMDB } from "@/lib/config/Constants";
import { SettingsRepository } from "@/lib/repositories/SettingsRepository";

/**
 * Result shape compatible with the `Resolver` contract consumed by
 * PosterActionProvider (`{ title, extract, thumbnail? }`). `source` is carried
 * for parity with WikipediaResult but is not required by the contract.
 */
export interface TmdbResult {
  title: string;
  extract: string;
  thumbnail?: string;
  source: "tmdb";
}

/** Minimal subset of a TMDB /search/multi result we rely on. */
interface TmdbMultiItem {
  media_type?: string;
  title?: string; // movies
  name?: string; // tv
  overview?: string;
  poster_path?: string | null;
  popularity?: number;
}

type CacheEntry = { value: TmdbResult; exp: number };

/**
 * Resolves a film / série title to its official TMDB poster + overview.
 *
 * TMDB is a cinema/TV-dedicated database, so it sidesteps the ambiguity that
 * plagues Wikipedia ("Titanic" → the ship). Used by the `poster-tmdb` provider;
 * théâtre / concerts / concepts keep using Wikipedia.
 *
 * The API key is read live from the `tmdb_api_key` setting (mirrors the
 * openai/anthropic key pattern). When absent, resolveAndFetch throws so the
 * provider's `resolveOrNull` simply yields no suggestion (graceful degradation).
 */
export class TmdbResolverService {
  private static instance: TmdbResolverService;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly now: () => number;
  private readonly fetchImpl: typeof fetch;

  private constructor(opts: { now?: () => number; fetchImpl?: typeof fetch } = {}) {
    this.now = opts.now ?? Date.now;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  static getInstance(): TmdbResolverService {
    if (!TmdbResolverService.instance) {
      TmdbResolverService.instance = new TmdbResolverService();
    }
    return TmdbResolverService.instance;
  }

  /** Test seam: build an isolated instance with injected clock / fetch. */
  static createForTest(opts: { now?: () => number; fetchImpl?: typeof fetch }): TmdbResolverService {
    return new TmdbResolverService(opts);
  }

  private getApiKey(): string {
    const key = SettingsRepository.getInstance().getSetting(TMDB.API_KEY_SETTING);
    if (!key) throw new Error("TMDB API key not configured");
    return key;
  }

  /** Read the stored key without throwing (empty string when unset). */
  private peekApiKey(): string {
    try {
      return this.getApiKey();
    } catch {
      return "";
    }
  }

  /**
   * Validate a TMDB API key against the lightweight `/configuration` endpoint.
   * Uses the provided key (the value typed in Settings, possibly unsaved) or, if
   * none is given, the stored key. Returns a friendly result instead of throwing
   * so the Settings "Test connection" button can show success/failure inline.
   */
  async testConnection(apiKeyOverride?: string): Promise<{ ok: boolean; message: string }> {
    const apiKey = (apiKeyOverride ?? "").trim() || this.peekApiKey();
    if (!apiKey) return { ok: false, message: "Aucune clé TMDB renseignée." };
    try {
      const res = await this.fetchImpl(
        `${TMDB.API_BASE}/configuration?api_key=${encodeURIComponent(apiKey)}`,
        { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(TMDB.REQUEST_TIMEOUT_MS) },
      );
      if (res.ok) return { ok: true, message: "Connexion TMDB OK." };
      if (res.status === 401) return { ok: false, message: "Clé TMDB invalide (401)." };
      return { ok: false, message: `TMDB a répondu ${res.status}.` };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Échec réseau TMDB." };
    }
  }

  /**
   * Search TMDB for a film/série and return its title, overview and poster URL.
   * Throws when no key is configured or no movie/tv match is found.
   */
  async resolveAndFetch(query: string): Promise<TmdbResult> {
    const q = query.trim();
    if (!q) throw new Error("empty query");

    const cached = this.cache.get(q.toLowerCase());
    if (cached && cached.exp > this.now()) return cached.value;

    const apiKey = this.getApiKey();
    const url =
      `${TMDB.API_BASE}/search/multi?` +
      new URLSearchParams({
        api_key: apiKey,
        query: q,
        language: TMDB.LANGUAGE,
        include_adult: "false",
      }).toString();

    const res = await this.fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(TMDB.REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`TMDB search failed (${res.status})`);

    const data = (await res.json()) as { results?: TmdbMultiItem[] };
    const candidates = (data.results ?? [])
      .filter((r) => r.media_type === "movie" || r.media_type === "tv")
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));

    const best = candidates[0];
    if (!best) throw new Error(`no TMDB film/série result for "${q}"`);

    const title = (best.title || best.name || q).trim();
    const result: TmdbResult = {
      title,
      extract: (best.overview || "").trim(),
      thumbnail: best.poster_path
        ? `${TMDB.IMAGE_BASE}/${TMDB.POSTER_SIZE}${best.poster_path}`
        : undefined,
      source: "tmdb",
    };

    this.cache.set(q.toLowerCase(), { value: result, exp: this.now() + TMDB.CACHE_TTL_MS });
    return result;
  }
}

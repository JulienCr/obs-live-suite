import { THEATER_DATA } from "@/lib/config/Constants";
import { SettingsRepository } from "@/lib/repositories/SettingsRepository";
import { Logger } from "@/lib/utils/Logger";

const logger = new Logger("TheaterDataResolverService");

/**
 * Result shape compatible with the `Resolver` contract consumed by
 * PosterActionProvider (`{ title, extract, thumbnail? }`). `source` is carried
 * for parity with the other resolvers but is not required by the contract.
 */
export interface TheaterDataResult {
  title: string;
  extract: string;
  thumbnail?: string;
  source: "theater-data";
}

/** A normalized candidate for the manual add-poster typeahead. */
export interface TheatreCandidate {
  id: number;
  title: string;
  /** The show's one-line tagline (`accroche`) — used as the poster description. */
  tagline: string;
  univers: string;
  /** Absolute, servable image URL (`${base}/poster/${id}`), image survives locally
   *  once ingested via `downloadToLocal`. */
  posterUrl: string;
}

/** Raw `PlaySummary` returned by theater-data's `GET /api/search` (French keys). */
interface TheaterDataSearchItem {
  id: number;
  titre?: string;
  accroche?: string | null;
  univers?: string | null;
}

type CacheEntry = { value: TheatreCandidate[]; exp: number };

/**
 * Resolves a spoken / typed show title to its BilletReduc affiche via the local
 * `theater-data` project (a SQLite base of French shows exposed over HTTP on
 * :4173). Purpose-built for théâtre / impro / concerts, so it sidesteps the poor
 * poster quality Wikipedia gives for stage shows (issue #116).
 *
 * Consumed two ways, both via `search` (NO LLM):
 *  - Live Assist: the `theater-db` fast-path ({@link TheaterDbMatcher}) calls `search`
 *    when a distinctive show title is spoken in show context, then proposes a card.
 *  - Manual add-poster UI: the `/api/theatre/search` proxy calls `search` (a list
 *    of candidates a human picks from).
 *
 * (`resolveAndFetch` is the top-1 convenience wrapper — retained for the manual/typed
 * path and tests; the Live Assist fast-path uses `search` directly.)
 *
 * The base URL is read live from the `theater_data_url` setting. The server is
 * launched manually in WSL, so it is often down — every network path degrades
 * silently: `search` returns `[]`, `resolveAndFetch` throws (→ no suggestion).
 */
export class TheaterDataResolverService {
  private static instance: TheaterDataResolverService;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly now: () => number;
  private readonly fetchImpl: typeof fetch;

  private constructor(opts: { now?: () => number; fetchImpl?: typeof fetch } = {}) {
    this.now = opts.now ?? Date.now;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  static getInstance(): TheaterDataResolverService {
    if (!TheaterDataResolverService.instance) {
      TheaterDataResolverService.instance = new TheaterDataResolverService();
    }
    return TheaterDataResolverService.instance;
  }

  /** Test seam: build an isolated instance with injected clock / fetch. */
  static createForTest(opts: { now?: () => number; fetchImpl?: typeof fetch }): TheaterDataResolverService {
    return new TheaterDataResolverService(opts);
  }

  /** Base URL of the theater-data server, trailing slash stripped. Read live so a
   *  Settings save takes effect without a restart. Returns `""` when the integration
   *  is explicitly disabled (setting saved blank); only a *missing* setting (never
   *  configured → `null`) falls back to the default, so clearing the field in Settings
   *  truly disables it instead of silently reviving localhost. */
  private getBaseUrl(): string {
    const raw = SettingsRepository.getInstance().getSetting(THEATER_DATA.URL_SETTING);
    if (raw === null) return THEATER_DATA.URL_DEFAULT;
    return raw.trim().replace(/\/+$/, "");
  }

  /**
   * Full-text search the base and return normalized candidates. Never throws —
   * returns `[]` on any failure (server down, timeout, non-200) so the typeahead
   * degrades to an empty state instead of blocking manual poster creation.
   */
  async search(query: string, limit: number = THEATER_DATA.SEARCH_LIMIT): Promise<TheatreCandidate[]> {
    const q = query.trim();
    if (!q) return [];

    const base = this.getBaseUrl();
    if (!base) return []; // integration disabled (setting saved blank) — no localhost hit

    // Cache key includes the base URL so switching `theater_data_url` at runtime never
    // serves stale candidates (their posterUrls embed the base that produced them).
    const cacheKey = `${base}|${q.toLowerCase()}:${limit}`;
    const cached = this.cache.get(cacheKey);
    if (cached && cached.exp > this.now()) return cached.value;

    const url = `${base}/api/search?` + new URLSearchParams({ q, limit: String(limit) }).toString();

    try {
      const res = await this.fetchImpl(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(THEATER_DATA.REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) {
        logger.info(`theater-data search failed (${res.status}) for "${q}"`);
        return [];
      }

      const data = (await res.json()) as TheaterDataSearchItem[];
      const candidates: TheatreCandidate[] = (Array.isArray(data) ? data : [])
        .filter((item) => item && typeof item.id === "number" && item.titre)
        .map((item) => ({
          id: item.id,
          title: (item.titre ?? "").trim(),
          tagline: (item.accroche ?? "").trim(),
          univers: (item.univers ?? "").trim(),
          posterUrl: `${base}/poster/${item.id}`,
        }));

      this.cache.set(cacheKey, { value: candidates, exp: this.now() + THEATER_DATA.CACHE_TTL_MS });
      return candidates;
    } catch (error) {
      // Down / timeout / DNS — graceful: no results rather than a thrown error.
      logger.info(`theater-data unreachable for "${q}": ${error instanceof Error ? error.message : error}`);
      return [];
    }
  }

  /**
   * Ping the theater-data server's `/api/status` to validate connectivity. Uses the
   * provided URL (the value typed in Settings, possibly unsaved) or, if none is given,
   * the stored one. Returns a friendly result instead of throwing so the Settings
   * "Test connection" button can show success/failure inline.
   */
  async testConnection(urlOverride?: string): Promise<{ ok: boolean; message: string }> {
    const base = (urlOverride?.trim() || this.getBaseUrl()).replace(/\/+$/, "");
    if (!base) return { ok: false, message: "Aucune URL renseignée." };
    try {
      const res = await this.fetchImpl(`${base}/api/status`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(THEATER_DATA.REQUEST_TIMEOUT_MS),
      });
      if (res.ok) return { ok: true, message: `Connexion OK (${base}).` };
      return { ok: false, message: `Le serveur a répondu ${res.status}.` };
    } catch (error) {
      return { ok: false, message: error instanceof Error ? error.message : "Échec réseau." };
    }
  }

  /**
   * Resolve a show title to its affiche for the Live Assist poster provider.
   * Throws when the query is empty or no show matches (so the provider's
   * `resolveOrNull` simply yields no suggestion — graceful degradation).
   */
  async resolveAndFetch(query: string): Promise<TheaterDataResult> {
    const q = query.trim();
    if (!q) throw new Error("empty query");

    const best = (await this.search(q, 1))[0];
    if (!best) throw new Error(`no theater-data result for "${q}"`);

    return {
      title: best.title,
      extract: best.tagline,
      thumbnail: best.posterUrl,
      source: "theater-data",
    };
  }
}

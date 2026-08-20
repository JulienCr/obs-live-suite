import { SettingsService } from "@/lib/services/SettingsService";
import { ChannelManager } from "@/lib/services/ChannelManager";
import { WikipediaResolverService } from "@/lib/services/WikipediaResolverService";
import { TmdbResolverService } from "@/lib/services/TmdbResolverService";
import { TheaterDataResolverService } from "@/lib/services/TheaterDataResolverService";
import { Logger } from "@/lib/utils/Logger";
import { LiveAssistOrchestrator } from "@/lib/services/liveassist/LiveAssistOrchestrator";
import { TranscriptBuffer } from "@/lib/services/liveassist/TranscriptBuffer";
import { KeywordDetector } from "@/lib/services/liveassist/KeywordDetector";
import { WindowScheduler } from "@/lib/services/liveassist/WindowScheduler";
import { IntentExtractor } from "@/lib/services/liveassist/IntentExtractor";
import { SuggestionStore } from "@/lib/services/liveassist/SuggestionStore";
import { TranscriptRecorder } from "@/lib/services/liveassist/TranscriptRecorder";
import { PathManager } from "@/lib/config/PathManager";
import { ProviderRegistry, type ApplyResult } from "@/lib/services/liveassist/providers/ActionProvider";
import { PosterActionProvider } from "@/lib/services/liveassist/providers/PosterActionProvider";
import { DefinitionActionProvider } from "@/lib/services/liveassist/providers/DefinitionActionProvider";
import { LocalPosterProvider } from "@/lib/services/liveassist/providers/LocalPosterProvider";
import { LocalPosterMatcher } from "@/lib/services/liveassist/LocalPosterMatcher";
import { TheaterDbProvider } from "@/lib/services/liveassist/providers/TheaterDbProvider";
import { TheaterDbMatcher } from "@/lib/services/liveassist/TheaterDbMatcher";
import { PosterRepository } from "@/lib/repositories/PosterRepository";
import { LIVE_ASSIST } from "@/lib/config/Constants";
import { INTERNAL_APP_URL } from "@/lib/config/urls";
import type { LiveAssistEvent } from "@/lib/models/LiveAssist";

// ---------------------------------------------------------------------------
// Orchestrator factory — wires real services at backend boot time.
//
// This lives in its OWN module (not server/api/live-assist.ts) on purpose:
// the heavy service chain it imports (ChannelManager → WebSocketHub →
// CertificateManager → tlsContext.mjs) must NOT be pulled in when the router
// test imports createLiveAssistRouter. The backend runs as ESM, so this uses
// normal top-level imports (an earlier inline-require() workaround crashed at
// runtime with "require is not defined").
// ---------------------------------------------------------------------------

const logger = new Logger("LiveAssistBoot");

/**
 * Assembles real services and registers providers.
 * Called from server/backend.ts setupApiRoutes().
 */
export function buildOrchestrator(): {
  orchestrator: LiveAssistOrchestrator;
  store: SuggestionStore;
  registry: ProviderRegistry;
} {
  // Dev-only: tolerate the self-signed / Tailscale cert on the internal HTTPS call
  // to the frontend (poster / text-preset / lower-third). Mirrors the MCP server and
  // the NODE_TLS_REJECT_UNAUTHORIZED=0 that `pnpm setup:https` writes to .env — set
  // here too because the backend evaluates urls.ts BEFORE dotenv, so the .env value
  // may not have taken effect in time.
  if (process.env.NODE_ENV !== "production") {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  }

  const settingsService = SettingsService.getInstance();
  const getSettings = () => settingsService.getLiveAssistSettings();
  const liveAssistSettings = getSettings();
  const cm = ChannelManager.getInstance();
  const resolver = WikipediaResolverService.getInstance();

  const registry = new ProviderRegistry();

  // Where the provider apply callbacks POST (poster / text-preset / lower-third).
  //
  // Resolved at RUNTIME, not from urls.ts: the backend evaluates its imports (incl.
  // urls.ts) BEFORE dotenvConfig() runs, so urls.ts captured a stale `localhost`
  // fallback and missed NEXT_PUBLIC_APP_URL. By the time buildOrchestrator() runs,
  // .env IS loaded — so we read the app's REAL, browser-reachable, cert-valid origin
  // (NEXT_PUBLIC_APP_URL, e.g. https://edison:3000) here, falling back to the 127.0.0.1
  // loopback. localhost/127.0.0.1 both failed in the Tailscale-HTTPS setup because the
  // served cert is for the public host, not loopback.
  // Prefer runtime env (now that .env is loaded) over the imported constant, which
  // captured its fallback before dotenvConfig() ran: NEXT_PUBLIC_APP_URL (real public
  // origin) → INTERNAL_APP_URL env (explicit loopback override) → the stale import.
  const appBaseUrl =
    process.env.NEXT_PUBLIC_APP_URL || process.env.INTERNAL_APP_URL || INTERNAL_APP_URL;
  logger.info(`Live Assist provider calls target ${appBaseUrl}`);

  // Low-level POST→app-frontend helper: returns the parsed body + ok flag. A thrown fetch
  // (network/TLS) is turned into a clean { ok:false, error } (with the URL) instead of
  // escaping as an unhandled rejection.
  const appPost = async (
    path: string,
    body: unknown,
    method = "POST",
  ): Promise<{ ok: boolean; status: number; json: unknown; error?: string }> => {
    try {
      const r = await fetch(`${appBaseUrl}${path}`, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      let json: unknown;
      try {
        json = await r.json();
      } catch {
        json = undefined; // empty / non-JSON body (e.g. 204)
      }
      return { ok: r.ok, status: r.status, json };
    } catch (error) {
      // undici wraps the real reason (ECONNREFUSED / ENOTFOUND / cert) in `.cause`.
      const cause = (error as { cause?: { code?: string; message?: string } } | null)?.cause;
      const reason = cause?.code ?? cause?.message ?? (error instanceof Error ? error.message : "fetch failed");
      return { ok: false, status: 0, json: undefined, error: `${appBaseUrl}${path}: ${reason}` };
    }
  };

  // Shared POST→ApplyResult helper for provider apply callbacks (one fetch shape).
  const postJson = async (path: string, body: unknown, failLabel: string, method = "POST"): Promise<ApplyResult> => {
    const r = await appPost(path, body, method);
    if (r.ok) return { ok: true };
    return { ok: false, message: r.error ? `${failLabel} → ${r.error}` : `${failLabel} (${r.status})` };
  };

  // Both poster providers create a poster the same way: POST to the frontend API
  // with downloadToLocal so the image is saved as a local asset (not hotlinked).
  const createPoster = ({ title, fileUrl }: { title: string; fileUrl: string }) =>
    postJson("/api/assets/posters", { title, fileUrl, type: "image", downloadToLocal: true }, "poster create failed");

  // theater-db creates a poster the SAME way as the manual add-poster typeahead
  // (PosterManager.handleTheatreSelect) — carrying description/tags/metadata — and RETURNS
  // the created row so the provider can then show it on air. POST returns `{ poster }`.
  const createPosterAndGet = async (input: {
    title: string;
    fileUrl: string;
    description?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ ok: boolean; message?: string; poster?: { id: string; fileUrl: string } }> => {
    const r = await appPost("/api/assets/posters", {
      title: input.title,
      fileUrl: input.fileUrl,
      type: "image",
      downloadToLocal: true,
      tags: ["theatre"],
      description: input.description,
      metadata: input.metadata,
    });
    if (!r.ok) {
      return { ok: false, message: r.error ? `poster create failed → ${r.error}` : `poster create failed (${r.status})` };
    }
    const poster = (r.json as { poster?: { id: string; fileUrl: string } } | undefined)?.poster;
    return { ok: true, poster };
  };

  // Poster provider (Wikipedia): kept registered but DORMANT — its default keywords are now
  // empty (Wikipedia posters are poor, #116; théâtre → the theater-db fast-path, films → TMDB).
  // Re-add keywords in Settings to revive it. Still registered so any in-flight `poster`
  // suggestion resolves, and its Settings row stays available.
  registry.register(new PosterActionProvider(resolver, createPoster));

  // Poster provider (TMDB): films / séries — official posters, no Wikipedia ambiguity.
  registry.register(
    new PosterActionProvider(TmdbResolverService.getInstance(), createPoster, {
      id: "poster-tmdb",
      description: "Trouver l'affiche officielle d'un film / série cité (TMDB) et l'ajouter aux posters",
      defaultKeywords: LIVE_ASSIST.DEFAULT_KEYWORDS["poster-tmdb"],
      defaultContextPrompt: LIVE_ASSIST.DEFAULT_CONTEXT_PROMPTS["poster-tmdb"],
    }),
  );

  // (theater-data is no longer an LLM provider — it's the `theater-db` fast-path below.)

  // Definition provider:
  //  - "Diffuser" (on-air) → shows a brief Wikipedia extract on the lower-third
  //    overlay. Endpoint mirrored from mcp-server/src/tools/lower-third.ts:
  //      POST /api/overlays/lower { action:'show', payload:{ contentType:'text', body } }
  //  - "Valider" (pin) → saves the extract as a reusable « texte rapide » (text preset).
  registry.register(
    new DefinitionActionProvider(
      resolver,
      (text) =>
        postJson("/api/overlays/lower", { action: "show", payload: { contentType: "text", body: text } }, "lower-third failed"),
      ({ name, body }) => postJson("/api/assets/text-presets", { name, body }, "text-preset create failed"),
    ),
  );

  // Local posters: fuzzy-match an existing poster's title spoken on air, then SHOW
  // that poster (no creation, no LLM). Index all posters — incl. disabled — refreshed
  // live below. apply() posts the same /api/overlays/poster show payload as the MCP tool.
  const localPosterMatcher = new LocalPosterMatcher();
  // Re-index posters from the DB. Skipped when LocalPosters is disabled so the
  // 5s tick doesn't run getAll()+re-tokenize for a feature nobody is using; the
  // next tick after it's re-enabled repopulates the index.
  const refreshLocalPosters = (s: ReturnType<typeof getSettings>) => {
    if (!s.localPostersEnabled) return;
    localPosterMatcher.setPosters(PosterRepository.getInstance().getAll(), s.localPosterMinSimilarity);
    localPosterMatcher.setDomainKeywords(s.localPosterDomainKeywords);
  };
  refreshLocalPosters(liveAssistSettings);
  registry.register(
    new LocalPosterProvider(
      (payload) => postJson("/api/overlays/poster", { action: "show", payload }, "poster show failed"),
      // Enable the poster (idempotent PATCH) so it lands in the Affiches panel.
      (posterId) => postJson(`/api/assets/posters/${posterId}`, { isEnabled: true }, "poster enable failed", "PATCH"),
    ),
  );

  // theater-db: the REMOTE fast-path sibling of local-poster. When a distinctive show title
  // is spoken in show context, it queries the theater-data (BilletReduc) base :4173 directly
  // — NO LLM — for a poster NOT yet in the library. Gated by the shared show-domain keywords;
  // degrades silently when the base URL is unset or the server (WSL, manual) is down.
  const theaterDbMatcher = new TheaterDbMatcher((query, limit) =>
    TheaterDataResolverService.getInstance().search(query, limit),
  );
  const refreshTheaterDb = (s: ReturnType<typeof getSettings>) => {
    if (!s.theaterDbEnabled) return;
    theaterDbMatcher.setDomainKeywords(s.localPosterDomainKeywords);
    theaterDbMatcher.setMinSimilarity(s.theaterDbMinSimilarity);
  };
  refreshTheaterDb(liveAssistSettings);
  registry.register(
    new TheaterDbProvider(
      createPosterAndGet,
      (payload) => postJson("/api/overlays/poster", { action: "show", payload }, "poster show failed"),
      // Same theatreId identity the match hook dedups on, reused so a retry after a
      // failed "show" step reuses the row instead of downloading the affiche again.
      (theatreId) =>
        theatreId == null
          ? null
          : PosterRepository.getInstance()
              .getAll()
              .find(
                (p) =>
                  String((p.metadata as { theatreId?: number | string } | null | undefined)?.theatreId) ===
                  String(theatreId),
              ) ?? null,
    ),
  );

  // Persist transcripts (+ the suggestions they trigger) to a per-launch .log file.
  // One file per backend boot, in ~/.obs-live-suite/logs/transcripts/.
  const recorder = new TranscriptRecorder(PathManager.getInstance().getTranscriptsDir());
  logger.info(`Live Assist transcripts → ${PathManager.getInstance().getTranscriptsDir()}`);

  // Record every created suggestion at the single choke point (store.add → publish).
  // The two fast-paths (local-poster, theater-db) log their OWN richer line (recordLocalMatch:
  // word→token, rule, shadow) from their match hooks below, so skip the generic line for them
  // to avoid a duplicate; the LLM-window intents still log here.
  const FASTPATH_INTENTS = new Set(["local-poster", "theater-db"]);
  const store = new SuggestionStore((event: LiveAssistEvent) => {
    if (event.type === "suggestion:new") {
      const s = event.payload.suggestion;
      // Log the human-readable card title (s.entity is an opaque id for the fast-paths).
      if (!FASTPATH_INTENTS.has(s.intent)) recorder.recordSuggestion(s.intent, s.title, s.confidence);
    }
    cm.publishLiveAssist(event);
  });

  // Merge each provider's defaultKeywords as fallback when settings is empty.
  const buildKeywords = (s: ReturnType<typeof getSettings>): Record<string, string[]> => {
    const keywords: Record<string, string[]> = {};
    for (const p of registry.all()) {
      const configured = s.keywordsByProvider[p.id];
      keywords[p.id] = configured && configured.length ? configured : p.defaultKeywords;
    }
    return keywords;
  };

  // Per-provider extraction prompts: provider defaults overlaid by any non-empty
  // settings override (the IntentExtractor injects these as each intent's "Règle").
  const buildContextPrompts = (s: ReturnType<typeof getSettings>): Record<string, string> => {
    const merged: Record<string, string> = { ...registry.contextPrompts() };
    for (const [id, prompt] of Object.entries(s.contextPromptsByProvider ?? {})) {
      if (prompt && prompt.trim()) merged[id] = prompt;
    }
    return merged;
  };

  const initialContextPrompts = buildContextPrompts(liveAssistSettings);
  // One-time visibility: confirms the per-provider "Règle" (incl. the TMDB inference
  // guidance) is actually loaded into the extractor at boot.
  logger.info(`Live Assist context prompts: ${JSON.stringify(initialContextPrompts)}`);
  const extractor = new IntentExtractor(
    registry.ids(),
    registry.descriptions(),
    undefined, // use the default LLM generate fn
    initialContextPrompts,
  );

  const detector = new KeywordDetector(buildKeywords(liveAssistSettings));
  const scheduler = new WindowScheduler(
    liveAssistSettings.windowAfterSec * 1000,
    LIVE_ASSIST.WINDOW_MAX_WAIT_MS,
  );

  const orchestrator = new LiveAssistOrchestrator({
    buffer: new TranscriptBuffer(),
    detector,
    scheduler,
    extractor,
    registry,
    store,
    // Read live so Settings > Live Assist saves apply without a backend restart.
    getSettings: () => {
      const s = getSettings();
      return {
        windowBeforeSec: s.windowBeforeSec,
        windowAfterSec: s.windowAfterSec,
        confidenceThreshold: s.confidenceThreshold,
      };
    },
    // Gate ingest on the live settings flag (re-read each call).
    isEnabled: () => getSettings().enabled,
    // Gate the live transcript re-broadcast on the debug flag (re-read each call,
    // so toggling Settings > Live Assist takes effect without a backend restart).
    isTranscriptDebugEnabled: () => getSettings().transcriptDebug,
    // Non-LLM fast-path: a spoken poster title → a ready local-poster suggestion.
    // Every match is logged with its word→token / rule (explainability). In shadow
    // (dry-run) mode the matches are logged but NOT returned, so no card is fired —
    // letting you measure precision on real transcripts before trusting the gate.
    matchLocalPosters: (text, contextText) => {
      const s = getSettings();
      if (!s.localPostersEnabled) return [];
      const matches = localPosterMatcher.match(text, contextText);
      const fired = !s.localPostersShadow;
      for (const m of matches) {
        recorder.recordLocalMatch({
          title: m.poster.title,
          matchedWord: m.matchedWord,
          matchedToken: m.matchedToken,
          score: m.score,
          rule: m.rule,
          fired,
        });
      }
      return fired ? matches.map((m) => LocalPosterProvider.toSuggestion(m.poster, text, m.score)) : [];
    },
    // Non-LLM REMOTE fast-path: a spoken distinctive show title (in show context) → a query to
    // the theater-data base → a ready theater-db suggestion. Async (network); the orchestrator
    // calls it fire-and-forget. Same shadow/explainable-log semantics as matchLocalPosters.
    matchTheaterDb: async (text, contextText) => {
      const s = getSettings();
      if (!s.theaterDbEnabled) return [];
      const matches = await theaterDbMatcher.match(text, contextText);
      if (matches.length === 0) return [];
      // Skip a show already in the local library (that's local-poster's job) — dedup by theatreId.
      const localTheatreIds = new Set(
        PosterRepository.getInstance()
          .getAll()
          .map((p) => (p.metadata as { theatreId?: number | string } | null | undefined)?.theatreId)
          .filter((v) => v != null)
          .map(String),
      );
      const fresh = matches.filter((m) => !localTheatreIds.has(String(m.candidate.id)));
      // Re-read: the operator can disable theater-db or switch to shadow while the remote
      // base is answering, and the settings captured above are then stale. Judge on the
      // state that holds now, not the one that authorized the request.
      const after = getSettings();
      if (!after.theaterDbEnabled) return [];
      const fired = !after.theaterDbShadow;
      for (const m of fresh) {
        recorder.recordLocalMatch({
          provider: "theater-db",
          title: m.candidate.title,
          matchedWord: m.matchedWord,
          matchedToken: m.matchedToken,
          score: m.score,
          rule: "theater-db",
          fired,
        });
      }
      return fired ? fresh.map((m) => TheaterDbProvider.toSuggestion(m.candidate, text, m.score)) : [];
    },
    // Show the device's human label (e.g. "USB Mic") in status, not its id ("1").
    resolveDeviceLabel: (id) => settingsService.getSttDevices().find((d) => d.id === id)?.label ?? id,
    // Publish STT connected/disconnected state to overlay subscribers.
    publishStatus: (connected, device) =>
      cm.publishLiveAssist({ type: "stt:status", payload: { connected, device } }),
    // Publish each finalized transcript segment (live debug view in the panel).
    publishTranscript: (text, t0, t1) =>
      cm.publishLiveAssist({ type: "transcript", payload: { text, t0, t1 } }),
    // Persist each finalized transcript segment to the per-launch .log file
    // (always on while enabled, independent of the debug re-broadcast above).
    recordTranscript: (text) => recorder.recordTranscript(text),
  });

  // Seed the device label so status reports include the configured device name.
  orchestrator.setSttStatus(false, liveAssistSettings.inputDevice ?? null);

  // Periodic ticker — fires twice per stale window to keep latency low. Besides
  // flagging STT staleness it (a) re-syncs keyword list + window size from live
  // settings so Settings saves apply without a restart, and (b) drains pending
  // windows whose max-wait elapsed (a keyword followed by silence still fires).
  setInterval(() => {
    const s = getSettings();
    detector.setKeywords(buildKeywords(s));
    extractor.setContextPrompts(buildContextPrompts(s));
    refreshLocalPosters(s); // re-index posters (titles/sensitivity) from the DB, live
    refreshTheaterDb(s); // re-sync theater-db domain keywords + similarity from live settings
    scheduler.setAfterMs(s.windowAfterSec * 1000);
    orchestrator.tick(Date.now()).catch((error) => {
      logger.warn(`tick failed: ${error instanceof Error ? error.message : error}`);
    });
  }, Math.floor(LIVE_ASSIST.STT_STALE_MS / 2));

  return { orchestrator, store, registry };
}

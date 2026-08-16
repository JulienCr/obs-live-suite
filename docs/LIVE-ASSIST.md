# Live Assist — Real-time Studio Listening

> **Status: WIP — not production-ready.** Shipped by PR #117 (branch `feat/assistant-live`).
> This doc is the developer entry point: how it works *as coded today*, the HTTP contract,
> how to extend it, and the known gaps to close before production. For the original design
> rationale see the deep references at the bottom.

## What it is

A dedicated studio mic is transcribed in French (faster-whisper). Two paths turn speech into
**suggestion cards** the operator validates or ignores in a Dockview panel (**always
human-in-the-loop** — nothing goes on-air automatically):

- **LLM path** — when a configured **keyword** is heard, a **−15/+15 s** context window is sent to
  an **LLM extractor** (`poster-tmdb` for films/séries, `definition` for topics).
- **Non-LLM fast-paths** — on every segment, with a show-domain word in context: `local-poster`
  (fuzzy-match the spoken title against the **local** poster library) and `theater-db` (query the
  **remote** BilletReduc base :4173 directly for a title not yet in the library). No window, no LLM.

```
Python realtime-stt (capture + VAD + faster-whisper)  ──POST /api/stt/segment──►  Backend Express
  (isolated behind the HTTP contract)                                              TranscriptBuffer → KeywordDetector
                                                                                   → WindowScheduler → IntentExtractor (LLM)
                                                                                   → ActionProvider[] → SuggestionStore
                                                                                   → ChannelManager (channel `live-assist`)
                                                                                           │ WebSocket
                                                                                   ┌───────▼────────┐
                                                                                   │ LiveAssistPanel │  (cards + transcript debug)
                                                                                   └────────────────┘
```

## HTTP contract (backend Express, port 3002)

Defined in `server/api/live-assist.ts` (`createLiveAssistRouter`). The Python STT service and the
Next.js proxies are the only callers — the STT service is fully replaceable behind this contract.

| Endpoint | Caller | Role |
|---|---|---|
| `POST /api/stt/segment` | Python STT | Ingest one `TranscriptSegment` (`{text,t0,t1,final,confidence?}`). Non-final segments are ignored. |
| `POST /api/stt/devices` | Python STT | Publish the available input devices (`{devices:[{id,label}]}` → `SettingsService.saveSttDevices`). |
| `GET /api/stt/config` | Python STT (~2 s) | Returns `{enabled,inputDevice,whisperModel}` **and doubles as the liveness heartbeat** (`orchestrator.markSttAlive`). |
| `GET /api/stt/status` | dashboard | Current `{connected, device}`. |
| `GET /api/live-assist/suggestions` | Next proxy | `{suggestions, sttStatus}`. |
| `POST /api/live-assist/suggestions/:id/apply` | Next proxy | Body `{intent, payload}` → `registry.get(intent).apply(payload)`; on success marks `applied`. |
| `POST /api/live-assist/suggestions/:id/dismiss` | Next proxy | Marks `dismissed`. |

Next.js proxies (so the browser talks to port 3000, not the backend directly):
`app/api/live-assist/suggestions/route.ts`, `.../[id]/apply/route.ts`, `.../[id]/dismiss/route.ts`,
and `app/api/settings/live-assist/route.ts`.

## WebSocket channel

Channel `live-assist` (`LIVE_ASSIST.CHANNEL`), published via `ChannelManager.publishLiveAssist()`
(no-ack — overlays don't acknowledge). Each event is `{ type, payload }` (no `id`/`timestamp`
envelope, unlike `OverlayEvent`); the shapes below are the `payload` per `type`
(`lib/models/LiveAssist.ts`):

- `suggestion:new` — payload `{ suggestion }`
- `suggestion:update` — payload `{ id, status }`
- `stt:status` — payload `{ connected, device }`
- `transcript` — payload `{ text, t0, t1 }` (live debug view of what STT hears)

The panel subscribes through `lib/stores/liveAssistStore.ts` (zustand).

## Pipeline (stage by stage)

All in `lib/services/liveassist/`. The orchestrator owns the flow; each stage is a small, injectable unit.

1. **`TranscriptBuffer`** — rolling buffer (`BUFFER_RETENTION_MS` = 120 s). `append()`, `latestT1()`,
   `windowAround(tCenter, beforeMs, afterMs)` → `{text,t0,t1}`.
2. **`KeywordDetector`** — `scan(segment)` → `KeywordHit[]`, accent-insensitive whole-word match.
   Keyword list is rebuilt live from settings (`setKeywords`).
3. **`WindowScheduler`** — `register(hit, now)` coalesces nearby hits; `collectReady(latestT1, now)`
   fires a window once the `+afterSec` audio arrived **or** the wall-clock `WINDOW_MAX_WAIT_MS` (20 s)
   elapsed (so a keyword followed by silence still fires).
4. **`IntentExtractor`** — `extract(windowText, candidateProviderIds)` → `{actionnable,intent,entite,confiance}`
   via `generateObject` on `createAiModel()` (Settings > AI). Guards the result to a *candidate*
   provider for that window; failures degrade to non-actionnable.
5. **Provider** (`registry.get(intent)`) — `build(entity, window)` → `BuiltSuggestion | null`.
6. **`SuggestionStore`** — `add(built)` (dedup same `(intent,entity)` within `DEDUP_WINDOW_MS` = 10 min),
   `setStatus(id, status)`, `list()`; publishes `suggestion:new` / `suggestion:update`.
7. **`LiveAssistOrchestrator`** — `ingestSegment()` (per segment), `tick(now)` (periodic: staleness +
   drains pending windows), `markSttAlive()` / `checkStaleness()` (heartbeat → `stt:status`).
8. **`TranscriptRecorder`** — persists each finalized segment (and every suggestion it triggers) to a
   plain-text `.log`, **one file per backend launch** (`liveassist-YYYY-MM-DD_HH-MM-SS.log` in
   `~/.obs-live-suite/logs/transcripts/`). Recording is **always on while Live Assist is enabled**,
   independent of the `transcriptDebug` toggle (which only gates the websocket re-broadcast). The file
   is created lazily on the first segment; a disk error disables recording (logged once) and never
   breaks the pipeline. Wired in `buildOrchestrator()` via the orchestrator's `recordTranscript` callback
   (segments) and the `SuggestionStore` publisher (suggestions).

Assembled at boot by `buildOrchestrator()` in `server/api/liveAssistBoot.ts` (kept in its own module so
the router test doesn't pull in the WebSocketHub/TLS chain). A `setInterval(STT_STALE_MS/2)` ticker
re-syncs keywords + window size from live settings and drains pending windows.

## Extending — add an ActionProvider

Interface (`lib/services/liveassist/providers/ActionProvider.ts`):

```ts
interface ActionProvider {
  id: string;                 // also the LLM intent id and the keyword bucket key
  description: string;        // injected into the extractor prompt + schema enum
  defaultKeywords: string[];  // fallback when Settings keyword list is empty
  build(entity: string, window: TranscriptWindow): Promise<BuiltSuggestion | null>;
  apply(payload: Record<string, unknown>): Promise<ApplyResult>;
}
```

To add one (≈ 1 file + 1 registration):

1. Implement the interface (see `PosterActionProvider` / `DefinitionActionProvider` for `build` →
   preview + `applyPayload`, and `apply` → side effect). Reuse `WikipediaResolverService` and the
   existing overlay/asset endpoints rather than new code.
2. `registry.register(new YourProvider(...))` in `buildOrchestrator()`. The registry auto-feeds the
   extractor's intent enum + prompt catalogue (`registry.ids()` / `registry.descriptions()`).
3. Add default keywords under `LIVE_ASSIST.DEFAULT_KEYWORDS[<id>]` in `lib/config/Constants.ts`.
4. Add i18n keys (`messages/fr.json`, `messages/en.json`) for any new UI label.

Current providers:

*LLM path (keyword → window → extractor):*
- **`poster-tmdb`** — TMDB poster for a film/série (inference from clues allowed) → `apply` POSTs `/api/assets/posters`.
- **`definition`** — first N sentences of the Wikipedia extract; `apply` target `pin` (save as a text preset) or
  `on-air` → POSTs `/api/overlays/lower` `{action:'show',payload:{contentType:'text',body}}`.
- **`poster`** (Wikipedia) — kept registered but **dormant** (empty default keywords; Wikipedia posters are poor, #116).
  Re-add keywords in Settings to revive it. `WikipediaResolverService` is still shared by `definition`.

*Non-LLM fast-paths (per segment, gated by the shared show-domain keywords — no window, no LLM):*
- **`local-poster`** (`LocalPosterMatcher`) — fuzzy-matches the spoken title against titles ALREADY in the library;
  `apply` enables + shows the existing poster (`PATCH /api/assets/posters/:id` + `POST /api/overlays/poster`).
- **`theater-db`** (`TheaterDbMatcher`) — the REMOTE sibling. Deterministic, no-LLM query built from **the phrase that
  follows a show-domain word, bounded at the first commentary word** (interjection "ah", conjunction "mais",
  pronoun/opinion-verb "je crois") so the rest of the sentence isn't sent to the FTS (`"…de la pièce Roméo et Juliette Ah
  ouais c'est…"` → query `romeo juliette`; `"du spectacle Le Retour de Richard mais je crois…"` → `retour richard`). Title-
  internal connectors stay ("Roméo **et** Juliette"), and real title words the big stop-word list would drop (`retour`) are kept.
  A **coverage** post-filter keeps the candidates whose TITLE covers the most query terms. **Performer/author mode:** when no
  title matches but the query is a proper NAME (≥1 `!isGeneralWord` token — "roxane michelet", "cruau"), theater-data found the
  show via its cast/accroche index → propose the top FTS hit (conf 0.7). The `isGeneralWord` gate is what stops ordinary
  conversation ("un spectacle **génial** ce **soir**" — FTS matches ~anything on 2 words) from firing. STT misspellings of a
  name ("Cruau"→"Creuau") miss the FTS → no card. This is shaped by two verified facts:
  theater-data FTS is **AND-based** (`q="aimerais richard"`→[], `q="retour richard"`→ the show), and a single generic
  token pulls the wrong shows — so the query must be the actual title words. A **coverage** post-filter keeps the candidates
  whose TITLE covers the most query terms (fuzzy ≥ `theaterDbMinSimilarity`), so `Le retour de Richard 3` (retour+richard)
  beats `Retour vers la rupture` (retour only). Called **fire-and-forget** from `ingestSegment` (never blocks the LLM path);
  shows already in the library are skipped (that's `local-poster`'s job). `apply` = CREATE the poster (`downloadToLocal`,
  `tags:['theatre']`, `metadata.theatreId`) then SHOW it on the chosen side. Settings: `theaterDbEnabled` /
  `theaterDbShadow` / `theaterDbMinSimilarity`. **v1 limit:** the title must be announced AFTER the domain word (or as the
  next segment); a title cited before it won't trigger the remote query.

## Configuration & run

- **Settings page** `/settings/live-assist` (`components/settings/LiveAssistSettings.tsx`): enabled toggle,
  input device dropdown (populated from `POST /api/stt/devices`), whisper model, per-provider keyword editor,
  before/after window seconds, confidence threshold. Persisted via `SettingsService.getLiveAssistSettings()` /
  `saveLiveAssistSettings()`. The **backend** re-reads settings live — keyword lists, window size, confidence
  threshold and the enabled gate apply without a restart. **Exception:** the Python STT reads `inputDevice` and
  `whisperModel` only once at startup (`main.py`), so changing the mic or model requires restarting the STT
  service (`pnpm dev:stt` / PM2 `obs-stt`).
- **LLM**: cloud by default via `createAiModel()` (Settings > AI: Ollama / OpenAI / Anthropic). No hardcoded provider.
- **STT service** (`realtime-stt/`): `pnpm dev:stt` bootstraps the venv + installs deps + runs (`run.mjs`);
  PM2 app `obs-stt`. **Requires an NVIDIA GPU** — `main.py` loads faster-whisper with `device="cuda"`.
  It auto-detects http/https against the backend `/health`.

## Known gaps / TODO before production

- **~~VAD is a placeholder.~~ Done — three upstream gates in `realtime-stt/`.** The fixed `time.sleep(2.0)`
  batch is replaced by Silero-VAD silence-boundary segmentation, plus two cheaper gates that kill faster-whisper's
  silence hallucinations at the source (the upstream complement to the downstream `hallucinationFilter.ts`
  text blocklist). Pure helpers live in `realtime-stt/stt/gates.py` (unit-tested in `tests/test_gates.py`);
  the loop in `main.py` wires them to live audio:
    - **(a) RMS gate** (`is_silence`) — skip `model.transcribe()` on a near-silent span (saves GPU).
    - **(b) Confidence gate** (`keep_segment`) — drop segments by `no_speech_prob` / `avg_logprob` /
      `compression_ratio` (faster-whisper computes these; they used to be discarded). Mapped per-utterance
      confidence is forwarded into the `POST /api/stt/segment` `confidence` field.
    - **(c) VAD segmentation** (`decide_flush`) — a ~300 ms tick accumulates audio into a bounded `pending`
      buffer and flushes on a real end-of-utterance silence boundary via `faster_whisper.vad.get_speech_timestamps`
      (no new dependency), or on a max-length cap. `transcribe()` now runs with `vad_filter=False` (already
      pre-trimmed) and `condition_on_previous_text=False` (stops a hallucinated credit line bleeding forward).
  All thresholds are named constants in `main.py` (`GATE_DEFAULTS`), overridable via `config.json`. **Residual
  coupling:** Silero's `min_silence_duration_ms` (set from `vad_silence_ms`) doubles as both the end-of-utterance
  hangover *and* the intra-utterance phrase-merge threshold, and the invariant `vad_silence_ms > vad_speech_pad_ms`
  must hold or boundaries never fire. The backend wall-clock `WINDOW_MAX_WAIT_MS` still backstops latency.
- **Poster source quality → issue #116.** Wikipedia (especially FR) is a poor poster source (copyright, ambiguity),
  so the Wikipedia `poster` provider is now **dormant** by default: films/séries → `poster-tmdb` (TMDB), théâtre →
  the `theater-db` fast-path (BilletReduc :4173) + `local-poster`. `theater-db` needs the title announced after a
  show-domain word ("du spectacle X"); a title cited before the domain word won't trigger the remote query in v1.
- **OpenAI strict-mode extraction schema.** `IntentExtractor`'s schema uses `confiance: z.number()` with **no
  min/max** and the intent enum `["none", ...providerIds]`, because OpenAI structured-outputs (strict mode) rejects
  optional fields and numeric bounds. The confidence range is enforced by the orchestrator's threshold check, not Zod.
- **Providers.** `poster-tmdb` + `definition` (LLM) · `local-poster` + `theater-db` (fast-paths) · `poster` (Wikipedia, dormant).
  An Instagram provider was scoped as "phase 2" in the spec; not implemented. There is **no** "edit" card action (the
  apply is server-authoritative — the client only sends `target`).
- **Branch stacking.** PR #117 was stacked on `fix/chat-overlay-sommaire-lowerthird` (chat-highlight / régie / cue /
  lower-third polish); confirm that base is integrated before reading the PR diff in isolation.

## Tests

- **Jest** — `__tests__/services/liveassist/**` (buffer, detector, scheduler, extractor, store, orchestrator,
  providers + registry), `__tests__/api/live-assist.backend.test.ts`, `__tests__/api/live-assist.proxy.test.ts`,
  `__tests__/models/LiveAssist.test.ts`, `__tests__/components/LiveAssistSettings.test.tsx`. Run: `pnpm test`.
- **pytest** — `realtime-stt/tests/test_segmenter.py` (segment payload builder) and `realtime-stt/tests/test_gates.py`
  (the silence/confidence/VAD-boundary gate helpers). Run: `cd realtime-stt && pytest`.

## Reuse (DRY)

This feature is wired from existing pieces — extend those rather than adding parallel code:
`WikipediaResolverService`, the poster (`/api/assets/posters`) and lower-third (`/api/overlays/lower`) endpoints,
`ChannelManager` / `WebSocketHub`, `PANEL_REGISTRY` / Dockview, the `useSettings` hook, and `createAiModel()`.

## Deep reference

- Design spec: `docs/superpowers/specs/2026-06-24-assistant-live-design.md`
- Implementation plan (TDD task breakdown): `docs/superpowers/plans/2026-06-24-assistant-live.md`
- STT service: `realtime-stt/README.md`

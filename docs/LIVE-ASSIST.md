# Live Assist — Real-time Studio Listening

> **Status: WIP — not production-ready.** Shipped by PR #117 (branch `feat/assistant-live`).
> This doc is the developer entry point: how it works *as coded today*, the HTTP contract,
> how to extend it, and the known gaps to close before production. For the original design
> rationale see the deep references at the bottom.

## What it is

A dedicated studio mic is transcribed in French (faster-whisper). When a configured **keyword**
is heard, a **−15/+15 s** context window around it is sent to an **LLM extractor**, which decides
whether a known entity (a show/film title, a topic to define…) was cited. If so, an **action
provider** builds a **suggestion card** (title + preview + apply payload) that the operator
validates, edits, or ignores in a Dockview panel. **Always human-in-the-loop** — nothing goes
on-air automatically.

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
- **`poster`** — Wikipedia thumbnail → `apply` POSTs `/api/assets/posters` `{title,fileUrl,type:'image',downloadToLocal:true}`.
  Strips Wikipedia disambiguators (`Titanic (film, 1997)` → `Titanic`); falls back to a Google-images link if no thumbnail.
- **`definition`** — first N sentences of the Wikipedia extract; `apply` target `pin` (no-op, just keep the card) or
  `on-air` → POSTs `/api/overlays/lower` `{action:'show',payload:{contentType:'text',body}}`.

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

- **VAD is a placeholder.** `realtime-stt/main.py` batches a fixed ~2 s window (`time.sleep(2.0)`) instead of
  detecting silence boundaries (inline comment: "replace with VAD silence detection" / "Use silero-vad or
  webrtcvad here"). Replace with real silence-boundary VAD so
  segment timestamps align with utterance ends. *Mitigated today* by the backend wall-clock `WINDOW_MAX_WAIT_MS`
  — no suggestion is lost, only latency varies.
- **Poster source quality → issue #116.** Wikipedia (especially FR) is a poor poster source (copyright, ambiguity).
  Disambiguation + Google-images fallback are in place, but a real source (TMDB / EN-wiki / web search) is tracked
  in #116. Related idea: per-keyword contextualization prompts.
- **OpenAI strict-mode extraction schema.** `IntentExtractor`'s schema uses `confiance: z.number()` with **no
  min/max** and the intent enum `["none", ...providerIds]`, because OpenAI structured-outputs (strict mode) rejects
  optional fields and numeric bounds. The confidence range is enforced by the orchestrator's threshold check, not Zod.
- **Only two providers.** `poster` + `definition`. An Instagram provider was scoped as "phase 2" in the spec.
- **Branch stacking.** PR #117 was stacked on `fix/chat-overlay-sommaire-lowerthird` (chat-highlight / régie / cue /
  lower-third polish); confirm that base is integrated before reading the PR diff in isolation.

## Tests

- **Jest** — `__tests__/services/liveassist/**` (buffer, detector, scheduler, extractor, store, orchestrator,
  providers + registry), `__tests__/api/live-assist.backend.test.ts`, `__tests__/api/live-assist.proxy.test.ts`,
  `__tests__/models/LiveAssist.test.ts`, `__tests__/components/LiveAssistSettings.test.tsx`. Run: `pnpm test`.
- **pytest** — `realtime-stt/tests/test_segmenter.py` (segment payload builder). Run: `cd realtime-stt && pytest`.

## Reuse (DRY)

This feature is wired from existing pieces — extend those rather than adding parallel code:
`WikipediaResolverService`, the poster (`/api/assets/posters`) and lower-third (`/api/overlays/lower`) endpoints,
`ChannelManager` / `WebSocketHub`, `PANEL_REGISTRY` / Dockview, the `useSettings` hook, and `createAiModel()`.

## Deep reference

- Design spec: `docs/superpowers/specs/2026-06-24-assistant-live-design.md`
- Implementation plan (TDD task breakdown): `docs/superpowers/plans/2026-06-24-assistant-live.md`
- STT service: `realtime-stt/README.md`

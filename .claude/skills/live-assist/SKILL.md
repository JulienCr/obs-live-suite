---
name: live-assist
description: >-
  Orient yourself before working on the live-assist feature — the real-time studio listening system
  (mic → French faster-whisper STT → keyword detection → −15/+15s context window → LLM intent
  extractor → action providers → validatable suggestion cards in a Dockview panel). Use this WHENEVER
  the task touches live-assist, the STT pipeline (`realtime-stt/`, `lib/services/liveassist/`), a
  keyword detector / window scheduler / intent extractor, an ActionProvider, suggestion cards, the
  `live-assist` WebSocket channel, or the `/settings/live-assist` page — even on terse asks like
  "add a new live-assist suggestion type" or "why isn't STT producing suggestions". The feature is
  WIP / not production-ready, so this skill points you at the current state and the known gaps before
  you change anything.
---

# Working on live-assist

**Read `docs/LIVE-ASSIST.md` first.** It is the up-to-date developer guide grounded in the shipped
code: the end-to-end data flow, the full HTTP contract, the `live-assist` WebSocket events, the
pipeline stage-by-stage, configuration/run, and — importantly — the **known gaps** (VAD placeholder
in `realtime-stt/main.py`, Wikipedia-as-poster-source quality → issue #116, the OpenAI-strict
extractor schema). Don't rediscover those; build on them. Deeper design rationale lives in
`docs/superpowers/specs/2026-06-24-assistant-live-design.md` (+ the plan alongside it).

## Most common task: add an ActionProvider

A provider turns an extracted entity into a suggestion card + an apply side-effect. Adding one is
~1 file plus a registration. Interface (`lib/services/liveassist/providers/ActionProvider.ts`):

```ts
interface ActionProvider {
  id: string;                 // also the LLM intent id and the keyword bucket key
  description: string;        // injected into the extractor's prompt + schema enum
  defaultKeywords: string[];  // fallback when the Settings keyword list is empty
  build(entity: string, window: TranscriptWindow): Promise<BuiltSuggestion | null>;
  apply(payload: Record<string, unknown>): Promise<ApplyResult>;
}
```

1. Implement it — model it on `PosterActionProvider` (`build` → preview + `applyPayload`) and
   `DefinitionActionProvider` (`apply` → side-effect via an existing endpoint). **Reuse** the
   existing services rather than new code: `WikipediaResolverService`, the poster endpoint
   (`/api/assets/posters`), the lower-third endpoint (`/api/overlays/lower`).
2. Register it with `registry.register(new YourProvider(...))` inside `buildOrchestrator()`
   (`server/api/liveAssistBoot.ts`). The registry auto-feeds the extractor's intent enum + prompt
   (`registry.ids()` / `registry.descriptions()`) — no extractor edits needed.
3. Add default keywords under `LIVE_ASSIST.DEFAULT_KEYWORDS[<id>]` in `lib/config/Constants.ts`.
4. Add i18n keys (`messages/fr.json`, `messages/en.json`) for any new UI label.

## Map of the pieces
- **Pipeline** (`lib/services/liveassist/`): `TranscriptBuffer` → `KeywordDetector` →
  `WindowScheduler` → `IntentExtractor` (LLM via `createAiModel()`) → providers → `SuggestionStore`,
  orchestrated by `LiveAssistOrchestrator`, assembled in `server/api/liveAssistBoot.ts`.
- **Contract**: backend router `server/api/live-assist.ts` (`POST /api/stt/segment`, the
  `/api/live-assist/suggestions*` routes); Next proxies under `app/api/live-assist/**`.
- **UI**: `components/dashboard/panels/LiveAssistPanel.tsx`, `components/live-assist/`,
  `lib/stores/liveAssistStore.ts`. **Models**: `lib/models/LiveAssist.ts`.
- **STT service**: `realtime-stt/` (Python, `pnpm dev:stt`, requires CUDA).

## Local poster fast-path (`LocalPosterMatcher`)

Parallel to the keyword/LLM path, **every STT segment** is instantly fuzzy-matched against poster
titles already in the DB — no window, no LLM. Entry point: `LiveAssistOrchestrator.ingestSegment()`
→ `matchLocalPosters(text)` → `LocalPosterProvider.toSuggestion()`.

**How matching works** (`lib/services/liveassist/LocalPosterMatcher.ts`):
1. Each poster title is indexed as its *trigger tokens*: alphanumeric words ≥ `LOCAL_POSTER_MIN_TOKEN_LEN`
   (4 chars) that are **not** in `LOCAL_POSTER_STOPWORDS_FR`.
2. On each segment, spoken words are fuzzy-compared (Levenshtein) against trigger tokens. A poster
   matches on its best token/word pair ≥ `LOCAL_POSTER_MIN_SIMILARITY` (0.8).
3. A single distinctive trigger token is enough — e.g. "Faust" (5 chars, proper noun) matches alone.

**Stopwords are the key tuning lever.** `LOCAL_POSTER_STOPWORDS_FR` in `lib/config/Constants.ts`
is the spaCy French stopword list filtered to ≥4 chars (normalised — accents stripped, same `norm()`
as the rest of the pipeline). It covers ~340 words and prevents common French words from being
trigger tokens.

**Design decisions to remember:**
- Use the spaCy list as source of truth — don't hand-craft. Manually add only obvious omissions
  (`"bien"` is notably absent from spaCy).
- **No multi-token requirement.** Requiring 2+ token matches was considered and rejected: it breaks
  short single-word proper-noun titles ("Faust", "Carmen") that must match on their own.
- A poster whose title is made entirely of stopwords (unlikely for cultural titles) becomes
  undetectable via the fast-path. That's acceptable — the keyword/LLM path covers it.

**Debugging false positives** (spurious local-poster suggestions): check if the matched title
token is in `LOCAL_POSTER_STOPWORDS_FR`. If not, add it (after checking it's not a distinctive word
in any real poster title). Run `pnpm test LocalPosterMatcher` to verify.

**Debugging false negatives** (a poster you'd expect to match doesn't): check `triggerTokens(title)`
— if all title words are stopwords or < 4 chars, the poster has no triggers and can never match
via the fast-path. Either add a more distinctive word to the title, or use a keyword to route it
through the LLM path.

## Debugging "no suggestions appear"
Walk the pipeline in order (the orchestrator logs each stage): is STT posting segments
(`POST /api/stt/segment`)? did a keyword fire? did the window flush (timestamp or
`WINDOW_MAX_WAIT_MS`)? did the extractor return `actionnable` above the confidence threshold (is an
AI provider configured in Settings > AI)? did the provider's `build()` find anything? `docs/LIVE-ASSIST.md`
has the full flow and the exact failure points.

## Reuse / related skills
Live-assist is wired from existing pieces — extend those, don't parallel them (`dry-guardrails`).
Adding a dashboard panel for it? See `new-panel`. New overlay output? See `new-overlay`.

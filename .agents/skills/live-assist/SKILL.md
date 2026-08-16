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
→ `matchLocalPosters(text, contextText)` → `LocalPosterProvider.toSuggestion()`. The orchestrator
passes a recent **look-back window** (≈ `windowBeforeSec`, from the buffer) as `contextText`.

**How matching works** (`lib/services/liveassist/LocalPosterMatcher.ts`) — **evidence-based** since
the over-sensitivity fix (a single fuzzy hit on one common word used to fire false cards in prod;
see the "Femme de boue" ⟵ spoken "fermé" case):
1. Each poster title is indexed as its *trigger tokens*: alphanumeric words ≥ `LOCAL_POSTER_MIN_TOKEN_LEN`
   (4 chars) that are **not** in `LOCAL_POSTER_STOPWORDS_FR`.
2. **Length-aware fuzz.** A token of ≤ `LOCAL_POSTER_FUZZY_MIN_LEN` (6) chars must match a spoken word
   **exactly**; only longer tokens tolerate Levenshtein typos (≥ `localPosterMinSimilarity`, default
   0.85). This kills the 1-edit-on-a-5-char-word collisions (spoken "ferme" ≈ title token "femme").
3. **Domain words are context, not identity.** A matched token that is *itself* a domain keyword
   ("impro", "film") is dropped from the fire decision — saying "l'impro" must NOT light up every
   impro-titled poster. It still feeds the `context` signal. (Fire decisions use these *identity*
   hits = matched tokens minus domain keywords.)
4. **Single-token fires require title-uniqueness.** A token shared by ≥2 indexed titles ("thierry"
   across 4 Thierry variants) is *ambiguous* — it identifies no single poster, so it can't fire one
   alone (`tokenTitleCount`). It can only contribute to corroboration. ("Thierry Ding" fires via the
   unique "ding"; bare "Thierry" fires nothing.)
5. **Fire gate** (precedence: `distinctive` → `context` → `corroboration`), on identity hits:
   - `distinctive`: a matched identity token that is SPECIFIC (`!isGeneralWord` — not a common
     French/English word or bare number) **and** title-unique fires alone — proper nouns / made-up
     show names: "Eclypsia", "Casseroles", "Blackout", "Emeline".
   - `context`: a **mono-identity** general-word title ("Pilote", "Le Prime" — exactly one non-domain
     trigger token) whose token is **unique** fires when a domain keyword (`LOCAL_POSTER_DOMAIN_KEYWORDS`:
     spectacle/impro/pièce/théâtre/film/cinéma/concert/série) is in the look-back `contextText`. A
     **multi-token** title can't fire on one general word — "petite" alone never fires "La Petite
     Maison dans la prairie", "féminin" never fires "Féminin Pluriel" (needs a specific token or corroboration).
   - `corroboration`: ≥2 identity tokens of the same title match.
   - Else: no fire → falls back to the keyword/LLM path.
6. `match()` returns explainability per hit: `matchedToken`, `matchedWord`, `score`, `rule`.

**Tuning levers:**
- `LOCAL_POSTER_STOPWORDS_FR` — spaCy French stopwords (~340, ≥4 chars), excluded from trigger
  tokens entirely (indexing). Source of truth; don't hand-craft (only `"bien"` was added manually).
- **`isGeneralWord(token)`** (`lib/config/commonWords.ts`) — THE precision gate. True for a bare number
  OR a common French word (`FRENCH_COMMON_WORDS`, top-15000, ~12.9k entries) OR a common English word
  (`ENGLISH_COMMON_WORDS`, top-9000, ~8.2k). A general word can't fire alone; only a SPECIFIC token
  (proper noun / made-up name) can. Frequency alone can't separate show words from common words (names
  appear in subtitle frequency lists; "loups"#5397 < "féminin"#7426), so we gate on FR+EN dictionary-
  style membership. Regenerate both lists with `scripts/generate-common-words.mjs <freq-file> <topN> <VAR> <Lang>`
  from hermitdave/FrequencyWords. Raise N for stricter.
- `LOCAL_POSTER_DOMAIN_KEYWORDS` (+ the `localPosterDomainKeywords` setting) — the show-context words
  that unlock the `context` rule for general-word titles. Editable in Settings › Live Assist.
- `LOCAL_POSTER_MIN_SIMILARITY` (0.85, + the `localPosterMinSimilarity` setting) — long-token fuzz floor;
  0.85 blocks near-miss different words ("construction"→"constructor" ≈ 0.83) while keeping real typos
  ("Éclipsia"→"Eclypsia" = 0.875).

**Junk posters:** metadata can't separate them (in the real DB the junk is `isEnabled`, the real shows
are disabled). Imported file-name titles ("WhatsApp Video 2026-04-26…") can still leak via a brand token
("whatsapp") that's in no dictionary. The fix is library hygiene — delete non-show posters — not a rule.

**Design decisions to remember:**
- **Conditional** multi-token, not unconditional. Requiring 2+ tokens *always* was rejected (breaks
  "Faust"/"Carmen"); the gate keeps distinctive single tokens firing.
- Everyday-word titles ("Pilote", "Le Prime") need a show-domain keyword in context (or corroboration)
  to fast-fire — this is the hybrid-gate the user chose. "le pilote de l'avion" no longer fires "Pilote";
  "un spectacle… le Pilote" does (rule `context`). Domain word spoken *after* the title is v1-out-of-scope
  (the path is instant); a deferred-fire pass would be the enhancement.

**Replay / shadow tooling — use this to tune, don't guess:**
- **Shadow mode** (`localPostersShadow` setting): logs would-be matches to the transcript file
  (`>> SHADOW … via word→token [rule]`) WITHOUT firing cards. Real fires log `>> SUGGESTION … via
  word→token [rule]` (richer than the generic suggestion line).
- **Offline replay**: `pnpm replay:liveassist <transcript.log> [--db <data.db>] [--min <0-1>] [--window <sec>]`
  feeds a recorded session (its `>>` marker lines stripped) through the CURRENT rules against the real
  poster DB and prints what it WOULD propose. It parses the `[HH:MM:SS]` timestamps and applies the
  REAL `windowBeforeSec` look-back (default 15s, `--window` to override), so the `context` rule behaves
  exactly as live — "le pilote de l'avion" 25s after "spectacle d'impro" does NOT fire "Pilote". Built
  on `lib/services/liveassist/transcriptReplay.ts` (`parseTranscriptLog` + `replayLocalPosters`), the
  same helper the regression test uses (`__tests__/services/liveassist/transcriptReplay.test.ts`,
  fixture under `__tests__/fixtures/liveassist/`).

**Debugging false positives** (spurious suggestions): replay the transcript to see the `word→token
[rule]` that fired. If `[distinctive]` fired on a general word, `isGeneralWord` is missing it — raise
the FR/EN `topN` and regenerate (check it isn't the sole specific token of a real title first). If the
token is a brand from a junk imported poster ("whatsapp"), it's in no dictionary — delete the junk
poster, don't chase the word. If `[context]` fired, a domain keyword was nearby (intended); if too
generic, tighten `localPosterDomainKeywords`. A short token matching a typo shouldn't happen
(short = exact); check `LOCAL_POSTER_FUZZY_MIN_LEN`. `pnpm test LocalPosterMatcher transcriptReplay`.

**Debugging false negatives** (an expected poster doesn't match): check `triggerTokens(title)` — if
all words are stopwords or < 4 chars, there are no triggers. Else the sole trigger may be an
*everyday* word — it then needs a show-domain keyword in the recent context (the `context` rule) or a
2nd matching token (corroboration); a short token spoken with a typo also won't match (short = exact).
Add a distinctive word to the title, add a fitting domain keyword, or route it through a keyword.

## Debugging "no suggestions appear"
Walk the pipeline in order (the orchestrator logs each stage): is STT posting segments
(`POST /api/stt/segment`)? did a keyword fire? did the window flush (timestamp or
`WINDOW_MAX_WAIT_MS`)? did the extractor return `actionnable` above the confidence threshold (is an
AI provider configured in Settings > AI)? did the provider's `build()` find anything? `docs/LIVE-ASSIST.md`
has the full flow and the exact failure points.

## Reuse / related skills
Live-assist is wired from existing pieces — extend those, don't parallel them (`dry-guardrails`).
Adding a dashboard panel for it? See `new-panel`. New overlay output? See `new-overlay`.

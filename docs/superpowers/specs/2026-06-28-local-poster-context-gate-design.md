# Live Assist — context-aware local-poster matching

**Date:** 2026-06-28 · **Status:** approved, ready for implementation

## Problem

The local-poster fast-path (`LocalPosterMatcher`) fires a poster card the instant a title token
matches a spoken word. After the first precision pass (length-aware exact-for-short + a common-word
lexicon), residual false positives remain on *everyday* words that happen to be poster titles —
e.g. "*le pilote de l'avion*" fires the **Pilote** poster. The host's speech, however, carries a
strong signal we ignore: when the conversation is about a **show** ("spectacle", "impro", "pièce",
"théâtre", "film", "cinéma"), a nearby title-ish word is far more likely to be a real title.

## Goal

Make the fast-path **context-aware** without losing its instant, no-LLM nature: distinctive titles
still fire alone; *everyday-word* titles fire only when a show-domain keyword is in the recent
transcript window (or two title tokens corroborate). Chosen approach: **hybrid gate + short window**.

## Firing rule (`LocalPosterMatcher.match(text, contextText)`)

Token matching is unchanged (≤`LOCAL_POSTER_FUZZY_MIN_LEN`=6 → exact; longer → fuzzy ≥ `minSim`).
A matched token that is itself a domain keyword ("impro", "film") is a **category** word, not an
identity — it's dropped from the fire decision (but still feeds `domainPresent`). Let `M` = matched
**identity** tokens (hits minus domain keywords), `idTokenCount` = the title's non-domain trigger
tokens, `domainPresent` = a domain keyword appears in `contextText`. A poster fires if **any** of:

A **single-token** fire additionally requires the token to be title-**unique** (`tokenTitleCount == 1`):
a token shared by ≥2 titles is ambiguous and can only corroborate. Let `U` = unique tokens in `M`.

| Rule | Condition |
|------|-----------|
| `distinctive` | a token in `U` is **specific** — `!isGeneralWord` (not a common FR/EN word or number) |
| `context` | `domainPresent` **and** `idTokenCount == 1` **and** `U ≥ 1` (mono-identity, unique) |
| `corroboration` | `M ≥ 2` |

Else: no fire (falls back to keyword/LLM path). Precedence: distinctive → context → corroboration.

**Why the extra guards** (added after replaying a longer prod transcript): (1) without dropping
domain-keyword tokens, "l'impro" lit up every impro-titled poster; (2) without `idTokenCount == 1`,
one everyday word ("petite", with a domain keyword loosely in the window) fired a 5-word title ("La
Petite Maison dans la prairie"); (3) without uniqueness, "thierry" (rare but shared across 4 Thierry
variants) fired them all. All three reduce to the principle the user named: *a single
generic/ambiguous word carries no identity.* The offline replay parses the log's `[HH:MM:SS]` stamps
and applies the real `windowBeforeSec` look-back, so it reproduces the live `context` window exactly.

## General-word gate — `isGeneralWord` (superseded the frequency-threshold idea)

A single frequency threshold can't work: in the real library, legit show names appear in the subtitle
frequency list at ranks *overlapping* common words (`loups`#5397, `antoine`#5303 < `féminin`#7426), so
no cutoff separates "fire" from "gate". The discriminator the user named is **general word vs proper
noun**. So `isGeneralWord(token)` (`lib/config/commonWords.ts`) gates on dictionary-style membership:
true for a **bare number**, a **common French word** (`FRENCH_COMMON_WORDS`, OpenSubtitles top-15000,
~12.9k) or a **common English word** (`ENGLISH_COMMON_WORDS`, top-9000, ~8.2k). General → can't fire
alone; specific (proper noun / made-up name) → fires.

- Gated (general): `féminin`, `féminins`, `design`, `construction`, `masculin`, `building`, `network`,
  `video`, `automatic`, `2026`, plus the prior everyday words (`pilote`, `salon`, `femme`…).
- Fire (specific): `Eclypsia`, `Casseroles`, `Blackout`, `Emeline`, `Roxanne`, `pluriel` — proper
  nouns / made-up names absent from both dictionaries.
- English list added because titles (and imported junk) mix languages — `network`/`design`/`building`
  are common English. Fuzz floor raised to **0.85** so `construction`→`constructor` (≈0.83) stops matching.
- **Residual:** a brand token in a junk imported title ("whatsapp") is in no dictionary → still fires.
  Metadata can't filter junk (it's `isEnabled` while real shows are disabled) — the fix is deleting the
  junk poster, not a rule. On the real transcript this cut false positives from 17+ to 1 (the WhatsApp file).

## Domain keywords

New `LIVE_ASSIST.LOCAL_POSTER_DOMAIN_KEYWORDS` default
`["spectacle","impro","pièce","théâtre","film","cinéma","concert","série"]`, **editable** via a new
`localPosterDomainKeywords` setting (Settings › Live Assist). Normalized + tokenized with the
pipeline's `norm()`; matched whole-word against the context. Used **only** as the matcher's context
signal — NOT registered in the KeywordDetector (no wasted LLM window/calls).

## Window scope

The orchestrator passes the recent look-back transcript (≈ last `windowBeforeSec`, via
`TranscriptBuffer.windowAround(t1, windowBeforeSec, 0)`) as `contextText`, so "*c'est de l'impro*"
then "*on reçoit le Pilote*" corroborates across segments. **Out of scope (v1):** a domain word
spoken *after* the title — the path is instant; noted as a future deferred-fire enhancement.

## Components touched

- `lib/config/{frenchCommonWords,englishCommonWords}.ts` (generated) + `commonWords.ts` (`isGeneralWord`).
- `lib/config/Constants.ts` — add `LOCAL_POSTER_DOMAIN_KEYWORDS`.
- `lib/services/liveassist/LocalPosterMatcher.ts` — domain-keyword set + `context` rule; `match`
  gains `contextText`; `MatchRule` gains `"context"`.
- `lib/models/LiveAssist.ts` — `localPosterDomainKeywords` setting.
- `server/api/liveAssistBoot.ts` — set/refresh domain keywords; pass look-back context.
- `lib/services/liveassist/LiveAssistOrchestrator.ts` — build `contextText` from the buffer; new
  `matchLocalPosters(text, contextText)` signature.
- `lib/services/liveassist/transcriptReplay.ts` — rolling context (last K segments) + domain
  keywords, so replay/CLI reflect the window gate.
- `components/settings/LiveAssistSettings.tsx` + `messages/{fr,en}.json` — domain-keywords editor.

## Testing / verification

- Unit: update the `Pilote`-based tests to require domain context; add with/without-keyword and
  cross-segment window cases; `context` rule explainability.
- Regression: the prod 2026-06-27 chit-chat (no domain words) stays at **0 fires**.
- Replay: `pnpm replay:liveassist` against the real library — confirm `…un spectacle… Pilote` fires
  `[context]` while `le pilote de l'avion` stays silent.
- `pnpm type-check` (filter to touched files).

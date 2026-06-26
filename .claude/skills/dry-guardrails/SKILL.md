---
name: dry-guardrails
description: >-
  Before writing boilerplate in this repo, reuse the project's shared abstraction instead. Use this
  WHENEVER you are about to add or edit a Next.js API route (try/catch, error responses), a settings
  component (load/edit/save with useState+useEffect), a client-side fetch, a file upload handler, a
  WebSocket subscription, or any hardcoded number / timing / limit. It maps "what you're about to
  hand-roll" to "the existing utility you must call instead" with exact paths. This repo treats DRY
  as a hard rule (see CLAUDE.md Development Rules), and these utilities encode subtle correctness
  (ref-based effects, 400-vs-500 mapping) that re-implementations get wrong. Consult it even when
  the user only says "add an endpoint" or "add a settings toggle" — the reuse rule still applies.
---

# Reuse the abstraction — don't reinvent it

This repo has shared utilities for every common pattern. Re-implementing them by hand is the most
common quality regression here: it duplicates code AND drops the correctness the utility bakes in.
Before writing one of the patterns below, **read the named file and use it.** If the abstraction is
genuinely insufficient, extend it in place rather than forking a parallel version.

| About to write… | Use instead | Path |
|---|---|---|
| A settings form: `useState` + `useEffect` load + `handleSave` | `useSettings<TGet, TState>({ endpoint, initialState, fromResponse, toPayload? })` → `{ data, setData, loading, saving, saveResult, save }` | `lib/hooks/useSettings.ts` |
| A Next.js API route with `try/catch` returning JSON errors | `withErrorHandler(handler, "[Ctx]")` (with route params) or `withSimpleErrorHandler` (without), plus `ApiResponses.ok/created/badRequest/notFound/conflict/…` | `lib/utils/ApiResponses.ts` |
| A Next.js route that forwards to the Express backend | `proxyToBackend("/api/…", { method, body, errorMessage, logPrefix })` | `lib/utils/ProxyHelper.ts` |
| A client-side `fetch(...)` + `res.json()` + error handling | `apiGet` / `apiPost` / `apiPut` (throw `ClientFetchError`) | `lib/utils/ClientFetch.ts` |
| Saving an uploaded file (validate, unique name, mkdir) | `uploadFile(file, options)` and helpers | `lib/utils/fileUpload.ts` |
| Subscribing a component to real-time events | `useWebSocketChannel<T>(channel, onMessage, options)` → `{ isConnected, send, sendAck }` | `hooks/useWebSocketChannel.ts` |
| Propagating a data change across dashboards | `useDataSync` / `broadcastDataChange` | `hooks/useDataSync.ts` |
| A magic number, timeout, limit, or default | A named constant referenced from one place | `lib/config/Constants.ts`, `lib/config/AppConfig.ts` |

## Why this matters (not just style)

- `useSettings` stores its callbacks in **refs** to avoid the infinite re-render loop you get when
  passing inline `fromResponse`/`toPayload` into a plain `useEffect`. Hand-rolled versions reliably
  reintroduce that bug.
- `withErrorHandler` maps known validation errors to **400** and everything else to **500**, with a
  consistent log prefix. A bare `catch` that returns 500 for everything hides client errors.
- Centralized constants are why a timing tweak is one edit, not a hunt across 3–5 copies.

The known violation inventory (with file lists) lives at
`docs/audit-reports/03-dry-violations-audit.md` — useful context when refactoring.

## How to apply
1. Recognize the pattern from the left column before writing it.
2. Open the named file, read its signature/JSDoc (each has usage examples), and call it.
3. Only if it truly can't express your case: extend the shared utility, and note why in the diff —
   don't branch a one-off copy.

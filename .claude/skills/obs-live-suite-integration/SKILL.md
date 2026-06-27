---
name: obs-live-suite-integration
description: >-
  Diagnose and avoid the cross-process integration pitfalls of OBS Live Suite's
  dual-process architecture (Next.js frontend ⟷ Express backend ⟷ WebSocket hub).
  Use this WHENEVER you see "fetch failed" / ECONNREFUSED / a 422 from a backend
  call, a dashboard panel that won't refresh after a server-side change (you have
  to reload the page), a WebSocket `data-changed` / data-sync event that seems
  ignored, a backend service POSTing to the Next.js app (`/api/...`), Live Assist
  apply/dismiss cards that suddenly 404 or do nothing, or any work touching
  `ChannelManager.publish`, `broadcastDataChange`, `useDataSync`, `urls.ts`
  (APP_URL/BACKEND_URL), or `liveAssistBoot`. These bugs run WITHOUT a stack trace
  and waste hours — consult this skill before debugging any backend⟷frontend call
  or real-time refresh in this repo, even if the symptom looks unrelated at first.
---

# OBS Live Suite — cross-process integration gotchas

## Why this exists

OBS Live Suite runs as **separate Node processes** that must cooperate:

- **Next.js frontend** (port 3000) — UI + `app/api/*` route handlers.
- **Express backend** (port 3002) — services, OBS, orchestrators; `server/api/*`.
- **WebSocket hub** (port 3003) — real-time fan-out to overlays + dashboard.

They share a SQLite DB file and talk over HTTP + WS. Almost every painful bug in
this repo lives at a **process boundary**: a call from one process to another, or
an event published in one process and consumed in another. The traps below all
fail *silently* (no exception in your face) and produce a wrong result, so they
are easy to re-hit each session. Read the matching section before you start
guessing.

Quick symptom router:

| Symptom | Section |
|---|---|
| `"fetch failed"` / `ECONNREFUSED` from a backend→frontend POST | **1** |
| A panel doesn't refresh after a server-side change (reload fixes it) | **2** |
| A `/apply` (or similar) call returns **422** with a confusing message | **3** |
| Live Assist cards 404 on apply / do nothing on dismiss, mid-dev | **4** |

---

## 1. Backend → frontend "fetch failed"

**Symptom.** A backend service does `fetch("${APP_URL}/api/...")` (create a poster,
show an overlay, create a text preset…) and it throws `"fetch failed"`. Often it
reaches the browser flattened to a **422** (see §3) with body
`{"error":"… : fetch failed"}`.

**Two stacked root causes — both must be handled:**

### 1a. `urls.ts` is evaluated *before* `.env` loads (import ordering)
`server/backend.ts` calls `dotenvConfig()` in its module body, but **ES `import`s
are hoisted and evaluated first**. So `lib/config/urls.ts` computes `APP_URL` /
`BACKEND_URL` *before* dotenv runs — `process.env.NEXT_PUBLIC_APP_URL` is still
undefined, and `APP_URL` falls back to `https://localhost:3000`. The `.env` value
you set is silently ignored at the backend.

### 1b. `localhost` → IPv6 + HTTPS cert mismatch
On Node 22 + Windows, `localhost` resolves to `::1` (IPv6) while the dev server
listens on IPv4 → `ECONNREFUSED`. And with the Tailscale/mkcert HTTPS dev setup,
the served cert is for `edison` (the public host), **not** `localhost`/`127.0.0.1`
→ TLS validation fails. Either way undici reports the generic `"fetch failed"`.

**The fix.** For **server-to-server** calls from the backend to the Next.js app,
resolve the base URL **at runtime** (not the import-time `APP_URL`) and target a
host that is actually reachable + cert-valid:

```ts
// Resolved at runtime (after dotenv): the browser-reachable, cert-valid origin,
// falling back to the 127.0.0.1 loopback. NOT `localhost`, NOT import-time APP_URL.
const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || INTERNAL_APP_URL;
```

and ensure the dev TLS bypass is actually in effect in the backend process:

```ts
if (process.env.NODE_ENV !== "production") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}
```

- `INTERNAL_APP_URL` (in `lib/config/urls.ts`) is `${proto}://127.0.0.1:${APP_PORT}`
  — `127.0.0.1`, never `localhost`, to dodge the IPv6 trap. This mirrors what
  `mcp-server/src/config.ts` already does (it uses `127.0.0.1` for exactly this
  reason — see CLAUDE.md "Known Issues").
- Prefer `NEXT_PUBLIC_APP_URL` when set: it's the host the browser proves works.

**Make failures self-diagnosing.** A bare `"fetch failed"` tells you nothing.
undici puts the real reason on `error.cause`. Surface it:

```ts
const cause = (error as { cause?: { code?: string; message?: string } } | null)?.cause;
const reason = cause?.code ?? cause?.message ?? "fetch failed"; // ECONNREFUSED / ENOTFOUND / CERT_…
return { ok: false, message: `${label} → ${url}: ${reason}` };
```

**Reference impl:** `server/api/liveAssistBoot.ts` (`appBaseUrl` + `postJson`).
**To confirm which layer fails**, have the user run from their machine:
`curl -sk https://127.0.0.1:3000/api/obs/status` (reachable? cert?) and
`netstat -ano | findstr :3000` (what address is bound).

---

## 2. Data-sync / WebSocket event shape — panels don't refresh

**Symptom.** A change made **server-side** (e.g. Live Assist creates/enables a
poster, or any non-UI mutation) does NOT refresh the dashboard panel — you must
reload the page. It affects **both** React-Query panels (via `useDataSync`) **and**
local-state panels, which is the tell that the event itself isn't being consumed.

**Root cause — the generic publish wraps the payload.**
`ChannelManager.publish(channel, type, payload)` (in `lib/services/ChannelManager.ts`)
builds an **OverlayEvent** envelope:

```ts
this.wsHub.broadcast(channel, { channel, type, payload, timestamp, id });
```

So a `DataChangedEvent` sent via the generic publish (`broadcastDataChange` →
backend `/publish` → `channelManager.publish("system","data-changed", event)`)
arrives at the client nested under **`.payload`** — its `entity`/`clientId` are NOT
at the top level. Consumers that read `event.entity` directly get `undefined` →
`ENTITY_QUERY_KEYS[undefined]` → silent early-return → no invalidation.

**The asymmetry that misleads you:** `ChannelManager.publishLiveAssist` **spreads**
its event flat (`broadcast(channel, { ...event })`), so live-assist WS messages
(suggestion cards, transcript) *do* work — which makes it look like the WS layer is
fine while data-sync is mysteriously broken. It's the envelope shape, not the WS.

**The fix.** Unwrap with `parseDataChangedEvent()` (in `lib/models/DataSyncEvents.ts`)
— it accepts the wrapped OverlayEvent form (and a flat form defensively):

```ts
const event = parseDataChangedEvent(data); // not `data as DataChangedEvent`
if (!event) return;
```

Both consumers use it: `hooks/useDataSync.ts` (invalidates React Query) and
`hooks/useDataChangeRefetch.ts` (for panels that hold their own `useState` list).

**Also know:** `useDataSync` only invalidates **React Query** caches. A panel that
fetches into local `useState` (e.g. `PosterContent` in `components/dashboard/cards/PosterCard.tsx`)
is invisible to it — give such panels `useDataChangeRefetch(entity, refetch)` so a
server-side change re-runs their fetch. The clientId guard (`event.clientId ===
CLIENT_ID`) skips the tab's own changes; backend-originated events carry an
`"unknown"` clientId, so they pass.

**Pointers:** `lib/services/ChannelManager.ts` (publish vs publishLiveAssist),
`lib/utils/broadcastDataChange.ts`, `lib/models/DataSyncEvents.ts`,
`hooks/useDataSync.ts`, `hooks/useDataChangeRefetch.ts`. Confirmation log in the
browser console when it works: `[DataSync] Invalidating <entity>`.

---

## 3. The apply proxy flattens backend errors to 422

**Symptom.** A call to a Next.js proxy route (e.g.
`POST /api/live-assist/suggestions/:id/apply`) returns **422 Unprocessable Entity**
with the backend's error string — even when the backend really returned 502/500/404.

**Root cause.** The proxy route does `if (!r.ok) return ApiResponses.unprocessable(message)`
— it converts **any** non-ok backend response into a 422, keeping only the message.

**What to do.** **Trust the body, not the status.** Read `{"error":"…"}` — that's the
real failure. In particular: a 422 whose message is `"… fetch failed"` is actually
**§1**, not a validation error. When adding such proxies, propagate the real cause
in the message so the 422 is at least self-explaining.

**Pointers:** `app/api/live-assist/suggestions/[id]/apply/route.ts` (proxy),
`server/api/live-assist.ts` (the authoritative backend handler).

---

## 4. In-memory stores are wiped on hot-reload (stale cards)

**Symptom.** Mid-development, on-screen Live Assist suggestion cards stop working:
**Valider → 404**, **Ignorer → nothing happens** — with no code change that explains
it.

**Root cause.** `SuggestionStore` (`lib/services/liveassist/SuggestionStore.ts`) is
**in-memory**, created once per backend boot. `tsx watch` reloads the backend on any
edit to a backend-imported file → a fresh, empty store. The browser (zustand store,
not reloaded) still shows the old cards, but their ids no longer exist server-side →
`store.get(id)` is `undefined` → apply 404s, and `setStatus` finds nothing to
dismiss. This is a **dev-time artifact, not a code bug.**

**What to do.** After editing backend files, **generate a fresh suggestion** before
testing apply/dismiss — don't trust cards that predate the last reload. If it gets
painful, consider re-fetching the suggestion list on WebSocket (re)connect so stale
cards clear automatically. Apply the same suspicion to any other in-memory
singleton that holds request-scoped state across a `tsx watch` reload.

---

## General principle

When a backend⟷frontend interaction "does nothing" or fails without a stack trace,
suspect the **boundary** first: which process makes the call, what URL/host it
targets, whether `.env` was loaded before the constant was computed, and what
**shape** the event has when it arrives. The fix is almost always "make the boundary
explicit and self-diagnosing" — log the exact URL + cause, unwrap the envelope, read
the body not the status — rather than changing business logic.

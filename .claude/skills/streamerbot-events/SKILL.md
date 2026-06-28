---
name: streamerbot-events
description: >-
  Handle or add Streamer.bot (Twitch/YouTube) chat & alert events — follow, sub,
  resub, giftsub, raid, cheer, superchat. Use WHENEVER a viewer event shows an
  EMPTY name/displayName, an event you subscribed to never fires, you're adding a
  new event type, or you're touching lib/models/streamerbot/* (types.ts /
  normalizers.ts), StreamerbotGateway, or testing follow/sub flows. These bugs
  fail SILENTLY (undefined fields, dropped events — no stack trace), so read this
  before trusting our types or assuming the package is consistent.
---

# Streamer.bot event handling

## 1. The package's field naming is inconsistent PER EVENT — never assume

`@streamerbot/client` does **not** use a uniform naming convention across event
payloads. Our `lib/models/streamerbot/types.ts` must mirror each event's *real*
shape exactly, or the normalizer reads a non-existent field → `undefined` →
the viewer event renders with an **empty name and no error** (the original bug).

**Always verify against the source of truth** before writing/editing a normalizer:
`node_modules/@streamerbot/client/dist/index.d.ts` (search `TwitchFollow`,
`TwitchSub`, etc.). The current reality:

| Event | Convention | User-name fields |
|---|---|---|
| Follow | **snake_case** | `user_id`, `user_login`, `user_name` |
| Raid | **snake_case** | `from_broadcaster_user_login` / `_name` (+ `to_…`), `viewers` |
| Sub / ReSub | camelCase | `userName` (=login) **+ separate `displayName`**, `subTier` (number) |
| GiftSub | camelCase | gifter `userName`/`displayName` + `recipientUsername`/`recipientDisplayName`, `subTier` |
| Cheer | camelCase | `username` (lowercase **s**, not `userName`), `displayName`, `bits` |

Don't pattern-match off a *neighbouring* normalizer — the next event likely uses
a different convention. Tier comes as a **number** (`subTier`) and we stringify it
to our `"1000"|"2000"|"3000"` union.

## 2. Subscribing ≠ handling — the two lists drift

`doConnect()`'s `subscribe:` list and `setupEventListeners()` are maintained
separately and **have drifted**. Currently subscribed but with **no listener /
normalizer** (silently dropped): **Twitch `GiftBomb`** and **YouTube
`NewSubscriber`**. If an event "never fires," check the handler exists in
`setupEventListeners()` — not just that it's in the subscribe array.

## 3. Adding an event — the four touch points

1. **Type** in `lib/models/streamerbot/types.ts` — copied from the `.d.ts` (see §1).
2. **Normalizer** in `lib/models/streamerbot/normalizers.ts` → returns a `ChatMessage`
   (set `eventType`, `username`, `displayName`, `message`, `metadata`).
3. **Listener** in `StreamerbotGateway.setupEventListeners()` (and the `subscribe:`
   list in `doConnect()` if not already there).
4. **Presenter cue** (optional) — add the `eventType` to `VIEWER_EVENTS` and a title
   in `maybeSendPresenterCue()` so the presenter gets a named card in their feed.
   The display side (`ChatEventMessage.tsx`) also needs an icon/label branch.

All events flow through `handleEvent → processMessage` (persist + WS broadcast +
chat listeners + presenter cue). `injectTestEvent()` is the public entry the dev
tester uses to push a pre-built `ChatMessage` through that same pipeline.

## 4. Testing viewer events end-to-end — `/dev`

The dev-only page at **`http://localhost:3002/dev`** (backend, `NODE_ENV !== production`,
in `server/api/dev-events.ts`) fires **real EventSub payloads via the Twitch CLI**
(`twitch event trigger …`) and injects them through the full gateway pipeline. Use
it instead of rebuilding a harness.

- Requires the **Twitch CLI** in PATH (https://dev.twitch.tv/docs/cli).
- It captures the CLI's forwarded payload on an **ephemeral plain-HTTP listener**,
  NOT the main backend — because the backend serves HTTPS (mkcert/Tailscale) and the
  CLI's Go client can't speak plain HTTP to a TLS port nor validate that cert against
  `127.0.0.1`. (Symptom if you forward to the HTTPS backend directly: a POST error
  with body bytes `\x15\x03\x03…` — that's a TLS handshake record, i.e. wrong scheme.)
- The CLI generates **random** viewer names (e.g. `user-12345678`) — they can't be
  pinned via flags, but they're never empty, which is exactly what validates §1.
- Useful CLI flags: `--tier` (sub tier), `-C` (raid viewer count). `-l`/`--user-login`
  does **not** exist.

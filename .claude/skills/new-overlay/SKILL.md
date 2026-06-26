---
name: new-overlay
description: >-
  Scaffold a new broadcast overlay (an OBS browser source like lower-third, poster, countdown,
  chat-highlight) end-to-end in this repo: the OverlayChannel + event schema, the backend publish
  route, the Next.js proxy, the overlay page, and the Renderer/Display component pair wired to the
  WebSocket hub. Use this WHENEVER the task is to add, create, or build a new overlay / browser
  source / on-air graphic that the dashboard pushes live to OBS — even if the user just says
  "add an X overlay" or "make a new on-screen graphic" without naming the file pattern. Not for
  editing an existing overlay's visuals (use the overlay-animation agent) or for a dashboard panel
  (use new-panel).
---

# Add a new overlay

Overlays follow one consistent 7-file pattern across the repo. The fastest correct path is to
**copy the smallest existing overlay (`chat-highlight`) and rename**, because it has the least
incidental complexity (just show/hide). Read these reference files first, then mirror them:

- `lib/models/OverlayEvents.ts` — channel enum, event schemas, type guards
- `components/overlays/ChatHighlightRenderer.tsx` — the Renderer pattern
- `app/api/overlays/chat-highlight/route.ts` — the Next.js proxy
- `server/api/overlays.ts` — the backend publish handler

## The one thing that breaks every time: the channel string

Pick a kebab-case channel name (e.g. `now-playing`) and use **the exact same string** in all of:
the `OverlayChannel` enum value, the `app/overlays/<channel>/` dir, the `app/api/overlays/<channel>/`
dir, the `proxyToBackend("/api/overlays/<channel>")` path, and the `useWebSocketChannel("<channel>")`
call. A mismatch fails silently — the overlay connects but never receives events. Grep the channel
string at the end to confirm it appears in exactly those places.

## File-touch checklist

1. **`lib/models/OverlayEvents.ts`** — the single source of truth for the contract:
   - Add the channel to the `OverlayChannel` enum.
   - Add a `<Name>EventType` enum (e.g. `SHOW`, `HIDE`).
   - Add a Zod payload schema (`<name>ShowPayloadSchema`) + inferred type.
   - Add the event interfaces + a discriminated union (`<Name>Event`), and add it to `TypedOverlayEvent`.
   - Add a type guard `is<Name>Event` using a `Set` of its type strings (follow `isChatHighlightEvent`).
2. **`server/api/overlays.ts`** — add a `POST /api/overlays/<channel>` handler that validates the
   payload with the Zod schema and calls `ChannelManager.publish(OverlayChannel.X, type, payload)`.
   Also add your overlay's hide/reset to the **`POST /clear-all`** panic handler in the same file — it
   lists every overlay explicitly (it is not derived from `OverlayChannel`), so a new source stays
   on-air when the operator hits clear-all unless you add it.
3. **`app/api/overlays/<channel>/route.ts`** — thin proxy: `withSimpleErrorHandler` wrapping
   `proxyToBackend("/api/overlays/<channel>", { method: "POST", body, ... })`. Do NOT hand-roll
   try/catch or fetch here (see the `dry-guardrails` skill).
4. **`app/overlays/<channel>/page.tsx`** — a transparent full-screen wrapper that renders `<XRenderer />`.
5. **`components/overlays/<Name>Renderer.tsx`** — owns the WebSocket + state:
   ```tsx
   const { sendAck } = useWebSocketChannel<XEvent>("<channel>", handleEvent, { logPrefix: "X" });
   ```
   In `handleEvent`, switch on `data.type` (`show`/`hide`/…), update state, then **always call
   `sendAck(data.id)`** so the dashboard knows the overlay received it (forgetting this breaks
   acknowledgment tracking). Wrap the Display in `<OverlayMotionProvider><AnimatePresence>` for
   enter/exit animation, keyed by a stable id.
6. **`components/overlays/<Name>Display.tsx`** — pure presentational component (props in, Framer
   Motion animations). No WebSocket logic here.
7. **`components/overlays/<name>.css`** — optional styles for the Display.

## Then
- Add the browser-source URL to the **Overlays** list in `CLAUDE.md` (size 1920×1080).
- If the overlay needs dashboard controls, add a panel — see the `new-panel` skill (separate concern).
- For animation polish (timing, GPU-friendly transforms), hand off to the `overlay-animation` agent.

## Verify
1. `pnpm type-check` is clean for your touched files (the discriminated union + type guard catch most mistakes).
2. Open `http://localhost:3000/overlays/<channel>` and POST to `/api/overlays/<channel>` from the
   dashboard — confirm the event renders and that the dashboard receives the ack.
3. Grep the channel string: it must appear in OverlayEvents enum, both route dirs, the proxy path,
   and the `useWebSocketChannel` call — nowhere misspelled.

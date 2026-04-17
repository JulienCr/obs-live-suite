# Studio Return (Tauri App)

Transparent always-on-top overlay shown on the studio-return HDMI monitor. Displays director cue messages over the OBS program output.

**Stack**: Rust (Tauri) + vanilla JS frontend. Not Next.js.

## Run / Build

```bash
pnpm studio-return:dev                # cargo tauri dev
pnpm studio-return:dev -- -- --debug  # with green debug overlay
pnpm studio-return:build              # production build
```

## Layout

- `src-tauri/` — Rust backend: monitor detection, settings polling, window management
- `src/` — vanilla JS frontend: WebSocket client, notification display, CSS animations
- `src-tauri/tauri.conf.json` — window config (requires `macOSPrivateApi: true`)
- `config.json` — optional server-URL override (next to built binary, or in repo root for dev)

## How it works

1. Connects to the WebSocket hub (port 3003), subscribes to the `presenter` channel
2. Renders cue messages (from CueComposerPanel) as large centered text with severity colors
3. Auto-dismisses after configurable duration
4. Window is click-through when no notification is visible
5. Polls `/api/settings/studio-return` every 30s for monitor/duration/fontSize
6. Reports available monitors to `/api/settings/studio-return/monitors` (powers dashboard dropdown)

## WebSocket fallback chain

Tries `wss://localhost:3003` → `ws://localhost:3003` → `ws://127.0.0.1:3003`. Locks to the first that succeeds. Needed because the hub may bind IPv6-only under Node 22, and because HTTPS/WSS is mkcert-signed in dev.

## config.json (server URL override)

```json
{ "url": "https://edison:3000" }
```

All fields optional: `url` (full URL, highest priority), `host`, `port`, `use_https`.

**Priority**: config file `url` > env `APP_URL` > individual config fields > env vars > defaults (`127.0.0.1:3000`).

Without a config file, probes HTTPS then HTTP on `127.0.0.1:3000`.

## Settings UI

Dashboard page: **Settings > Studio Return** (`/settings/studio-return`)
- Monitor selection (populated by the Tauri app at runtime)
- Display duration (3–60s)
- Font size (32–160px)
- Enabled toggle
- Test notification buttons (Info / Warn / Urgent)

API: `/api/settings/studio-return/` (GET/POST settings), `/api/settings/studio-return/monitors/` (GET/POST monitor list, in-memory).

## Gotchas

- **macOS transparency** requires BOTH `macOSPrivateApi: true` in `tauri.conf.json` AND the `macos-private-api` Cargo feature. Missing either → opaque window.
- **IPv6-only hub**: if the WS hub binds to `::1`, the `ws://127.0.0.1:3003` fallback handles it. Don't "fix" this by hardcoding `localhost`.
- **`--debug` flag** enables a green bottom-left overlay showing WebSocket state and message flow. Useful for field debugging.
- A separate web overlay page (`/overlays/studio-return`) exists for browser-source use — it's not a replacement for this Tauri app.

# Studio Return

Transparent always-on-top overlay for the studio return monitor. Displays director cue messages over the OBS program output.

Built with [Tauri v2](https://v2.tauri.app/) (Rust + vanilla JS). Designed for Windows production use, also works on macOS for development.

## How it works

The Studio Return app is a frameless, transparent, click-through window that sits fullscreen on a designated monitor (typically the studio return TV connected via HDMI). It connects to the OBS Live Suite WebSocket hub and displays cue messages sent by the director from the dashboard.

```
Dashboard (CueComposerPanel)
    → POST /api/presenter/cue/send
        → WebSocket hub (port 3003, channel "presenter")
            → Studio Return app displays notification
```

## Prerequisites

- [Rust](https://rustup.rs/) toolchain
- OBS Live Suite backend running (`pnpm dev` or `pnpm pm2:start`)

## Commands

```bash
# From the project root:
pnpm studio-return:dev                # Development mode
pnpm studio-return:dev -- -- --debug  # Development mode with debug overlay
pnpm studio-return:build              # Production build (installer in target/release/bundle/)
```

## Configuration

Settings are managed from the OBS Live Suite dashboard: **Settings > Studio Return** (`/settings/studio-return`).

| Setting | Default | Description |
|---------|---------|-------------|
| Monitor | 0 (primary) | Target monitor for the overlay. List populated by the Tauri app. |
| Display duration | 10s | Time before auto-dismiss (3-60s) |
| Font size | 80px | Text size for messages (32-160px) |
| Enabled | true | Enable/disable the overlay |

Test buttons (Info / Warn / Urgent) are available in the settings page to verify the overlay works.

## Architecture

```
studio-return/
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs        # Tauri setup, settings polling, window management
│   │   ├── main.rs       # Entry point
│   │   └── monitor.rs    # Monitor detection, positioning, backend reporting
│   ├── Cargo.toml
│   └── tauri.conf.json
└── src/
    ├── index.html         # Minimal page structure
    ├── notification.js    # WebSocket client, message display, settings bridge
    └── styles.css         # Severity colors, fade animations, backdrop
```

### Severity styles

| Severity | Border/accent color | Animation |
|----------|-------------------|-----------|
| info | Blue (#3b82f6) | None |
| warn | Amber (#f59e0b) | None |
| urgent | Red (#ef4444) | Pulsing border |

### WebSocket connection

The app tries multiple URLs in order to handle both HTTPS (mkcert) and plain HTTP environments:

1. `wss://localhost:3003`
2. `ws://localhost:3003`
3. `ws://127.0.0.1:3003`

Once connected, it locks to the working URL. Reconnects with exponential backoff on disconnect.

### Settings flow

1. On startup, the Tauri app POSTs the available monitor list to `/api/settings/studio-return/monitors`
2. It fetches settings from `/api/settings/studio-return` and positions the window accordingly
3. Every 30s, it re-reports monitors and re-fetches settings
4. Settings changes (fontSize, displayDuration) are forwarded to the frontend via `window.eval`

### Debug mode

Launch with `--debug` to enable a green overlay panel (bottom-left) showing:
- WebSocket connection attempts and status
- Incoming message parsing
- Notification display events

## Known issues

- **macOS transparency** requires `macOSPrivateApi: true` in tauri.conf.json and the `macos-private-api` Cargo feature
- **IPv6/IPv4**: Node 22 may bind the WebSocket hub on IPv6 only — the WSS/WS fallback chain handles this automatically

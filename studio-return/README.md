# Studio Return

Transparent always-on-top overlay for the studio return monitor. Displays director cue messages over the OBS program output.

Built with [Tauri v2](https://v2.tauri.app/) (Rust + vanilla JS). Designed for Windows production use, also works on macOS for development.

## How it works

The Studio Return app is a frameless, transparent, click-through window that sits fullscreen on a designated monitor (typically the studio return TV connected via HDMI). Tauri handles native window management while the rendering is done by the Next.js overlay page (`/overlays/studio-return`).

```
Dashboard (CueComposerPanel)
    → POST /api/presenter/cue/send
        → WebSocket hub (port 3003, channel "presenter")
            → Tauri webview (loads Next.js /overlays/studio-return)
                → StudioReturnRenderer handles WS messages
                → StudioReturnDisplay renders notification with Framer Motion
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

### Server URL (`config.json`)

When running the OBS Live Suite server on a different machine, place a `config.json` next to the executable:

```json
{
  "url": "https://edison:3000"
}
```

All fields are optional:

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Full server URL — overrides all other fields |
| `host` | string | Hostname (default: `127.0.0.1`) |
| `port` | number | Port (default: `3000`) |
| `use_https` | bool | Force HTTPS if true |

Resolution priority: `config.json` `url` → env `APP_URL` → individual fields → env vars → defaults (`http://127.0.0.1:3000`).

Without a config file, the app probes HTTPS then falls back to HTTP on `127.0.0.1:3000`.

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
    ├── index.html         # Minimal bootstrapper page
    ├── main.ts            # Bootstrapper — waits for overlay URL from Rust, navigates to Next.js
    ├── debug.ts           # Debug overlay logging (green panel, click-to-copy)
    ├── types.ts           # Window interface extensions for Tauri bridges
    └── styles.css         # Loading indicator, transparent background
```

### Severity styles

| Severity | Border/accent color | Animation |
|----------|-------------------|-----------|
| info | Blue (#3b82f6) | None |
| warn | Amber (#f59e0b) | None |
| urgent | Red (#ef4444) | Pulsing border |

### WebSocket connection

The Next.js overlay uses `useWebSocketChannel("presenter")` which auto-connects to the WebSocket hub. The Tauri Rust backend probes HTTPS first (for mkcert dev certs), then falls back to HTTP.

### Settings flow

1. On startup, the Tauri app POSTs the available monitor list to `/api/settings/studio-return/monitors`
2. It fetches settings from `/api/settings/studio-return` and positions the window accordingly
3. The Rust backend sends the overlay URL to the Vite bootstrapper, which navigates to the Next.js page
4. Every 30s, the Rust backend re-reports monitors and re-fetches settings
5. Real-time settings changes are pushed via WebSocket (`studio-return-settings` event)
6. Monitor repositioning is done via Tauri `reposition_monitor` command from JS

### TLS configuration

By default, the Rust HTTP client accepts self-signed certificates (for mkcert dev environments). To enforce strict TLS validation in production:

```bash
STUDIO_RETURN_STRICT_TLS=true pnpm studio-return:dev
```

### Debug mode

Launch with `--debug` to enable a green overlay panel (bottom-left) showing:
- WebSocket connection attempts and status
- Incoming message parsing
- Notification display events

## Known issues

- **macOS transparency** requires `macOSPrivateApi: true` in tauri.conf.json and the `macos-private-api` Cargo feature
- **IPv6/IPv4**: Node 22 may bind the WebSocket hub on IPv6 only — the WSS/WS fallback chain handles this automatically

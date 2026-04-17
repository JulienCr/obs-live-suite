# Stream Deck Plugin (obslive-suite)

Elgato Stream Deck plugin that talks to the OBS Live Suite HTTP API.

## Layout

- `src/` — TypeScript source
- `com.julien-cruau.obslive-suite.sdPlugin/` — build output (the Elgato bundle; do not edit directly)

## Actions

Lower Third (guest), Countdown Start, Poster Show, Quiz controls, Panic.

List all current action IDs:

```bash
pnpm streamdeck:ids      # From repo root
```

## Integration model

The plugin calls the Next.js API directly (via `/api/actions/*` and similar) rather than talking to OBS over WebSocket. The backend handles any OBS interaction.

Two supported patterns:
1. **Simple**: `POST /api/actions/{action}` — good for bespoke macros / mapped keys
2. **Native plugin (recommended)**: full Stream Deck SDK action surface, using the HTTP API underneath

## Gotchas

- **Build output path**: `com.julien-cruau.obslive-suite.sdPlugin/` is what Elgato loads — never hand-edit files in that directory; edit `src/` and rebuild.
- **Action IDs are stable**: changing an action's id in the manifest breaks users' existing buttons — prefer adding new actions over renaming.
- **HTTP API assumes the suite is running** at its configured URL — the plugin doesn't retry aggressively; surface clear errors when the app is offline.

# OBS Live Suite – Functional & Technical Specification

**Goal**: A local desktop-first web app that centralizes live-show overlays (countdown, lower thirds, theatre posters) and provides a dashboard to manage them in real time, with Stream Deck triggers and an OBS extensions updater.

---

## 0) Stack Decision

**Choice: Next.js (React)**

* Strong ecosystem for local-first UIs, component libraries, and real-time patterns (Socket/Server Actions).
* Easy integration with **Tailwind + shadcn/ui**, forms (react-hook-form/zod), and file-system routing.
* User preference indicators (pnpm, no jQuery, comments EN, SCSS/Tailwind comfort).
* Nuxt is also excellent, but team/tooling alignment favors Next.js here; we’ll keep the architecture framework-agnostic so a later Nuxt port remains feasible.

**Runtime & Services**

* Next.js (App Router), Node 20+.
* Local WebSocket hub (Socket.IO or native ws) embedded in the Next server (or a sibling process) for low-latency overlay signaling.
* OBS control via **obs-websocket** (v5).
* Packaging: run as `pnpm dev` for dev; ship as `pm2` script or packaged desktop (option: Tauri/Electron later).

---

## 1) High-Level Features

1. **Overlay Control Suite**

   * Lower thirds (name, role, show branding)
   * Countdown timers (start/stop/pause, presets, styles)
   * Theatre posters (image/video, scheduled rotation, quick take-over)
   * DSK-style global overlay layer toggle (acts across scenes)
   * Style themes (light/dark/custom brand palette)
   * Multi-show presets (per show: guests, brand, colorway)

2. **Real-Time Dashboard**

   * One-page control surface with clearly labeled buttons + preview tiles.
   * Hot presets (e.g., “Show OPEN”, “Interview Lower”, “End Card”).
   * State indicators from OBS (connected, current scene, recording/streaming status).

3. **Stream Deck Integration**

   * Simple **HTTP endpoints** per action (idempotent); optional WebSocket client for state feedback (icon states).
   * Ready-to-import Stream Deck Profile: buttons pre-mapped to app endpoints.

4. **OBS Extensions Updater**

   * Scan installed **plugins** & **scripts**; show versions.
   * Compare with remote **registry** (GitHub Releases/OBS Project mirrors) and propose updates.
   * One-click “open download page” (no auto-patching initially; optional safe auto-update mode later).

5. **Profiles / Shows**

   * Save and load complete sets: overlays, presets, brand, fonts, transitions.
   * Export/Import profile as zip (assets + json config).

---

## 2) UX / UI Specification

### 2.1 Dashboard (Live Control)

* **Header status bar**: OBS status (green/yellow/red), current scene, streaming/recording toggles, clock.
* **Overlay tiles**:

  * **Lower Third** card: fields {Title, Subtitle}, quick-select from “Guests”, buttons [Show], [Hide], [Auto (x sec)], position selector (Left/Right).
  * **Countdown** card: presets (10:00, 5:00, 2:00), input minutes/seconds, [Start], [Pause], [Reset], style dropdown (bold/compact), sound cue toggle at T–10s.
  * **Poster** card: current poster preview, carousel selector, [Take Over], [Fade], schedule widgets.
* **Macros bar**: configurable row of scene-agnostic macros (sequence of overlay actions).
* **Event Log**: last 50 actions (who/when/what) for audit/undo.

### 2.2 Assets Library

* Grid of **Posters** (image/video), metadata (title, tags, show), drag to re-order, bulk import.
* **Guests** list for lowers (name, subtitle/role, color accent, avatar optional).
* Fonts & brand palettes management (global + per profile).

### 2.3 Presets & Show Profiles

* Create a **Show Profile** (e.g., “CQLP”, “Impro Cabaret”).
* Each profile stores: lower-third theme, countdown theme, poster rotation, macros, default scene mapping, audio cues.
* Assign a profile as **current** (quick switch resets overlays to that profile’s defaults).

### 2.4 OBS Extensions Updater

* **Scanner**: list installed plugins/scripts with path & version.
* **Remote check**: show latest version, release date, changelog teaser.
* **Actions**: [Visit Release], [Mark Ignored], [Add to Watchlist].
* **Safety**: warn about major updates, incompatible OBS versions.

### 2.5 Settings

* OBS WebSocket URL/password, connection test.
* DSK layer source name(s), fallback behavior if missing.
* Stream Deck endpoints base URL.
* Paths to scan for plugins/scripts (override auto-detected).
* Backup/export of app config.

---

## 3) System Architecture

### 3.1 Modules

* **UI (Next.js)**: App Router, server actions for small ops, client components for live controls.
* **Realtime Hub**: WebSocket server to broadcast overlay state changes to Browser Sources.
* **OBS Adapter**: thin wrapper over obs-websocket to:

  * Toggle a global **Habillage** scene item (DSK-like),
  * Update Text/Browser source settings,
  * Query current scene/recording/streaming state.
* **Overlay Renderer**: static HTML routes served by the app (Browser Source URLs). Overlays subscribe to WS channel and animate via CSS.
* **Registry Service (Updater)**:

  * Local scanner: filesystem + version extraction.
  * Remote resolver: plugin registry (json) + GitHub release check (rate-limited, cached).

### 3.2 Data Models (conceptual)

* **Guest**: id, displayName, subtitle, accentColor, avatarUrl.
* **Poster**: id, title, fileUrl, duration, tags, profileIds[].
* **Preset**: id, type (lower/countdown/poster/macro), payload (depends on type).
* **Profile**: id, name, theme, fonts, macros[], defaultPosterRotation[], dskSourceName.
* **Plugin**: name, kind (plugin/script), localVersion, paths[], registryId, latestVersion?, releaseUrl?, notes.

### 3.3 Overlay Comms

* Channel names: `lower`, `countdown`, `poster`.
* Events (examples):

  * `lower/show { title, subtitle, side, themeId }`
  * `lower/hide {}`
  * `countdown/set { seconds }` / `countdown/start` / `countdown/pause` / `countdown/reset`
  * `poster/show { posterId, transition, duration }`
* Overlays acknowledge via `…/ack` for state sync.

### 3.4 State & Persistence

* Local JSON store (lowdb) or sqlite file via Prisma; profiles & assets stored under `~/.obs-live-suite/`.
* Asset references use file URLs; app keeps a catalog and verifies existence on launch.
* Configurable autosave; full export/import as zip.

---

## 4) Stream Deck Integration

**Simple mode (HTTP)**

* Each button triggers an **HTTP POST** to `http://localhost:<port>/api/actions/<action>` with a tiny JSON payload.
* The app executes the action (update state, broadcast WS, optionally call OBS).
* Optional feedback endpoint for Stream Deck to poll or a WebSocket client for live-icon states.

**Example actions (naming only, no code)**

* `lower.show`, `lower.hide`, `lower.showPreset:<guestId>`
* `countdown.start:<seconds>`, `countdown.pause`, `countdown.reset`
* `poster.takeover:<posterId>`
* `macro.run:<macroId>`

---

## 5) OBS Integration Contract

* **Connection**: validate URL/password; display OBS/obs-websocket versions; subscribe to state events.
* **DSK behavior**: a configured **Scene Item** (e.g., a group named `Habillage`) that is toggled globally; if missing, app prompts to auto-create and insert overlays.
* **Text inputs**: app can set text on named Text sources.
* **Browser sources**: app can set URL and visibility; overlays are Browser Sources pointing to local routes.
* **Scene awareness**: app reads current scene & transitions for context (non-invasive; overlays are scene-agnostic via DSK).

---

## 6) Plugins & Scripts Updater – Technical Plan

### 6.1 Local Discovery

* **Platforms**

  * macOS: inside OBS app bundle `/Applications/OBS.app/Contents/Resources/obs-plugins`, user scripts `~/Library/Application Support/obs-studio/scripts`.
  * Windows: `C:\Program Files\obs-studio\obs-plugins`, user scripts `%APPDATA%\obs-studio\basic\scripts`.
  * Linux: `/usr/lib/obs-plugins`, user scripts `~/.config/obs-studio/basic/scripts`.
* **Identification**

  * Read plugin metadata files when present (e.g., `.ini`, `.json`, or binary version via `obs-plugins/<name>.so/.dll` sidecar version text if available).
  * For scripts, detect headers in `.lua`/`.py` (conventionally version comment); fallback to hash.
* **Normalization**: produce `Plugin { name, kind, localVersion, paths[], registryId? }`.

### 6.2 Registry & Version Resolution

* **Registry JSON** bundled + updatable: maps `registryId -> { name, canonicalRepo, releaseFeed, matchRules }`.
* **Sources**

  * Preferred: **GitHub Releases** (semantic version tags) for popular plugins (Move Transition, Downstream Keyer, etc.).
  * Fallback: OBS Project mirrors or vendor sites.
* **Version Match**

  * Compare normalized semver; tolerate prefixes (`v1.2.3`).
  * Cache resolution results locally (24h) with manual “Check now”.

### 6.3 Safety & UX

* Indicate **compatibility** matrix: plugin version vs. OBS version (sourced from registry metadata when known).
* Provide **Release notes** excerpt; link to full changelog.
* No auto-install by default; offer **Open download page**. Phase 2: optional auto-update with backup & rollback.

---

## 7) Security & Reliability

* Local-only by default (bind to 127.0.0.1); optional LAN mode with auth token.
* CSRF protection for HTTP control endpoints;
* Rate-limiting on Stream Deck endpoints to avoid flooding.
* Graceful degradation if OBS disconnects (queue actions, replay when reconnected).
* Health panel: green/yellow/red with diagnostic hints.

---

## 8) Theming & Branding

* Global theme tokens: primary, accent, surface, text, success/warn.
* Lower-third templates: Classic, Bar, Card, Slide; per-profile colorways.
* Countdown styles: Bold (center), Corner (compact), Banner (full-width). Sound cue toggle.
* Poster transitions: Fade, Slide, Cut; optional blur backdrop.

---

## 9) Roadmap (Phased)

* **v0.1 (MVP)**: OBS connect, dashboard, overlays visible, HTTP actions, manual plugin scan.
* **v0.2**: Profiles, guest/poster libraries, countdown presets, WS feedback to Stream Deck.
* **v0.3**: Plugin registry auto-update, compatibility warnings, export/import.
* **v0.4**: Macro sequencer & scheduled rotations; audio cues.
* **v1.0**: Optional safe auto-updater for plugins with rollback.

---

## 10) Non-Goals (for now)

* No deep scene graph editing beyond DSK toggle & overlay visibility.
* No granular audio routing control (handled in Voicemeeter project).
* No cross-machine sync; single-host focus (can be added later with a small LAN discovery + auth).

---

## 11) Success Criteria

* Operator can run an entire show from the dashboard with ≤ 5 custom macros.
* Swapping shows takes < 30 seconds via profiles.
* Lower-third show/hide latency < 100 ms on the same host.
* Plugin updater detects >90% of commonly used plugins and surfaces update info within 2 clicks.

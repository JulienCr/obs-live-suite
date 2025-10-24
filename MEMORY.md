# Project Memory & Lessons Learned

This file documents key decisions, mistakes, and dead-ends encountered during development.

## Core Architecture

* **Ownership**: Backend owns services. Next.js serves UI only.

  * Backend: **WS 3003**, **HTTP 3002**
  * Next.js: **HTTP 3000**, **no WS**, **no init**
* **Startup**: Use `instrumentation.ts` to run server‑side init once.
* **Singletons**: Guard with a process‑safe lock (ServiceEnsurer). Never lazy‑start network servers in API routes.

## WebSocket Discipline

* Event envelope: `{ channel, data: { id, type, payload } }`
* **Always ACK**: client sends `{ type: "ack", eventId, success }` for any `data.id`.
* **Names**: Use the enum lower‑case strings everywhere. No custom ALLCAPS.
* Reconnect: no `location.reload()`; handle `close` with reconnection unless unmount.
* Dev mode: multiple processes — never bind the same port twice.

## React/Tests

* Declare `useCallback`/`useMemo` **before** `useEffect` that depends on them.
* Suppress noisy `act()` warnings only when behavior is verified.

## Type Safety

* No `any`. Create small interfaces for payloads, DB rows, WS messages.

## Validation

* Make unfinished fields **optional** (e.g., `themeId`). Prefer permissive schemas for WIP features.

## Timers

* Broadcast ticks for smooth UI (e.g., 500ms), **decrement seconds at 1000ms**.
* Stop timer on `reveal()` even if `lock()` was skipped.

## Overlay System

* Offer both **composite** and **individual** overlays.
* Clear separation of concerns: question metadata vs option rendering.
* On question change: transient `hiding` phase → fade out → load → staged fade in (text → image → options).
* Reveal: stop zoom; set scale=1; compute scores; emit `score.update`, `leaderboard.push`.
* Player assignment: emit `answer.assign`; show badges ✓ / 0 on reveal.

## Quiz System (essentials)

* Modes: **QCM text**, **QCM image options**, **image + text options**, **zoom reveal**, **mystery image (grid)**, **closest**, **open**.
* Services: `QuizStore` (JSON persistence), `QuizManager` (state + events), `QuizTimer`, `QuizZoomController`, `QuizMysteryImageController`, `QuizScoringService`.
* Host UI: 3‑panel layout, drag‑drop player → option, keyboard shortcuts, phase‑aware buttons.
* Overlay: event‑driven, no full reloads; handle `question.show/lock/reveal`, `vote.update`, `timer.tick`, `answer.assign`.
* Persistence: `PathManager.ensureDirectories()` must include quiz dirs; sessions CRUD; host can load session inline when none active.
* Zoom config: `{ durationSeconds, maxZoom, fps=30 }` with ease‑out cubic.
* Mystery image: 20px grid, Fisher‑Yates order, start/pause/resume/step; persist revealed count.
* Untimed questions: hide the timer when `time_s=0`.
* **Question Explanations**: Added optional `explanation` field to Question model. Shows only in host view during lock/reveal phases. Use blue info box styling for consistency with other host-only information.
* **Question Notes**: Added optional `notes` field to Question model. Shows in host view below explanation during lock/reveal phases. Use gray info box styling. Useful for sources, metadata, categories. Editable in QuestionEditor, imported via bulk import.
* **Closest Question Values**: The `correct` field accepts `z.number()` (not `.int()`) to support float values like 2.72, 0.047. QCM questions still use integer indices (0-3).
* **Bulk Import Duplicate Detection**: BulkQuestionImport checks for duplicate question IDs both in the import file and against existing questions in the database. Duplicates are shown as warnings and automatically skipped during import. Prevents importing the same question twice. Visual indicators: 30% opacity, strikethrough text, yellow "Duplicate - Will Skip" badge in preview. Uses both ID matching and text content matching (case-insensitive, trimmed).
* **Question List Features**: QuestionList includes search bar (searches text and notes), type filter dropdown, pagination (20 items per page), and adjacent "New Question" + "Bulk Import" buttons. Filters reset pagination to page 1. Shows filtered count vs total count.
* **Round Editor Question Selector**: RoundEditor's "Add Questions" section includes search bar and type filter (no pagination). Automatically hides questions that are already added to the round. Shows available count vs already added count.
* **Question Type Color Coding**: Question types have distinct badge colors - QCM (blue), Closest (purple), Open (green), Image (yellow). Applied in QuestionList and RoundEditor using shared `getQuestionTypeColor` utility.
* **Player Selector (Session Builder)**: PlayerSelector includes search bar for filtering guests by name or subtitle. Automatically hides already-selected guests from the available list. Shows all guests with no pagination. Displays count of available vs selected guests.
* **Session Update Bug Fix**: Fixed critical bug where editing a loaded session wouldn't update the file. The `/session/:id/update` endpoint now calls `setSession()` BEFORE `saveToFile()` to ensure both memory and disk are updated with the same data.

## Stream Deck

* Prefer native plugin over plain HTTP buttons.

  * `plugin.js` runs in Node → use `require('ws')` for WS.
  * Property Inspector runs in Chromium → `fetch`, browser WS.
  * Use `sendToPlugin` / `sendToPropertyInspector`; persist via `setSettings`.
* Convenience HTTP routes exist for quick wiring (ID‑based actions), but keep parity with enum types.
* **Dynamic button images and titles**: Use `setImage()` and `setTitle()` to update button appearance.
  * Fetch images from URLs and convert to base64 for display
  * Generate fallback SVG avatars with initials/letters for missing images
  * Update images and titles on `onWillAppear`, `onDidReceiveSettings` events
  * Cache guest/poster data to minimize API calls
  * For guests: show avatar and display name
  * For posters: show poster image/fallback icon and title
  * Track action instances in a Map to update specific buttons
  * Clear both image and title when no selection (`undefined` resets to default)
* **OBS WebSocket Client**: Direct connection to OBS WebSocket v5 (port 4455).
  * Use `obs-websocket-client.ts` utility for WebSocket communication
  * Supports OBS WebSocket v5 protocol with authentication (SHA-256 challenge-response)
  * Request/response pattern with opcode 6 (Request) and opcode 7 (RequestResponse)
  * Timeout requests after 10 seconds
  * Track pending requests in a Map with unique request IDs
  * Handle Hello (op 0), Identified (op 2), RequestResponse (op 7) opcodes
  * Only attempt connection once per action instance to avoid spam
  * **Vendor Plugin Support**: Include predefined requests for OBS plugins that extend WebSocket API
  * Downstream Keyer vendor requests: get/select/add/remove scenes, set tie, transitions, exclude scenes
  * Custom mode allows users to send any vendor-specific request type not in predefined list
  * **Automatic Vendor Request Detection**: Requests with lowercase+underscores (e.g., `dsk_select_scene`) are automatically wrapped in `CallVendorRequest` with proper vendor name
  * Vendor name mapping: `dsk_*` → "downstream-keyer"; generic pattern extracts prefix before first underscore
* **DSK Set Scene Action**: Dedicated action for Downstream Keyer scene selection.
  * Fetches DSK list via `get_downstream_keyers` request
  * Fetches scenes per DSK via `get_downstream_keyer` request (returns scenes array and current_scene)
  * Dynamically populates dropdowns based on OBS data
  * Uses `setState(0/1)` for button visual feedback: 0=inactive, 1=active
  * Compares selected scene with current DSK scene to determine button state
  * Sends `dsk_select_scene` request on button press to switch scenes
  * **CRITICAL**: Vendor requests return **nested** `responseData.responseData` structure
  * **CRITICAL**: Vendor response contains full object structure, not just strings:
    - `downstream_keyers` is array of objects with `name`, `scene`, `scenes[]` properties
    - `scenes` is array of objects with `name` property, NOT array of strings
    - Current scene property is `scene`, NOT `current_scene`
  * Must map object arrays to extract names: `downstream_keyers.map(dsk => dsk.name)`, `scenes.map(s => s.name)`

## Plugin Scanner / Updater

* Scan fixes: clear table before insert; dedup globally; skip duplicate dirs; handle Windows `32bit/64bit` DLLs.
* Built‑in filter: mark known OBS core plugins as ignored; toggle visibility.
* Version detection: look for metadata near DLL (`data/obs-plugins/<name>/manifest.json`, `version.txt`, locale `.ini`).

## Config & Secrets

* `.env` for secrets (gitignored). No real creds in repo.

## Don’t Repeat These

* Don’t start WS from Next.js. Don’t bind ports in more than one process.
* Don’t rely on first request for critical init.
* Don’t break enum parity for event types.
* Don’t place hooks after effects that depend on them.
* Don’t use `any`.

## Development Environment

* **Server Status**: Development server (pnpm dev) is already running in background
* **Access**: Server available at localhost:3000
* **Important**: Do not attempt to start pnpm dev again as it will cause conflicts

## Future

* DB migrations for schema changes.
* WS scale‑out via Redis pub/sub.
* File uploads: strict validation and limits.

— End —


---

*Last updated: January 2025*

## PRD — Local Chat Panel (Streamer.bot) for OBS Suite (Next.js)

### 1) Summary

Build a **100% local** chat panel inside OBS Suite (Next.js + Dockview) that renders real-time chat messages by connecting directly to **Streamer.bot WebSocket Server** using **`@streamerbot/client`**. The panel must work as an **OBS dock** and avoid any dependency on `chat.streamer.bot` (no iframe). ([streamerbot.github.io][1])

---

### 2) Goals

* Display real-time chat (initially **Twitch**, then optionally YouTube/Trovo) in a dockable panel.
* Zero “mixed content” issues by keeping everything local (default `ws://`), with an optional `wss://` mode for secure environments. ([docs.streamer.bot][2])
* Minimal latency, stable reconnection, good UX for a live show operator.

### 3) Non-goals (v1)

* Not a full replacement for Streamer.bot Chat UI (autocomplete menus, slash commands, etc.). ([docs.streamer.bot][3])
* No moderation actions (ban/timeout), no whispers/DMs, no multi-account sending.
* No guaranteed “offline emote rendering” (emotes often require fetching CDN assets).

---

### 4) Target users & scenarios

**Primary user:** streamer / director using OBS Suite during live shows.

* Monitor chat while switching scenes.
* Quickly spot highlighted messages (mods, subs, keywords).
* Keep chat visible even if internet pages / iframes break.

---

### 5) Success metrics

* Time-to-first-message after opening panel: **< 2s** on LAN/localhost.
* Reconnect after Streamer.bot restart: **automatic**, no manual refresh needed.
* Zero “blocked WS” errors in OBS dock for default local setup.

---

### 6) Functional requirements

#### 6.1 Connection & configuration

* Settings form:

  * `host` (default `127.0.0.1`)
  * `port` (default matches Streamer.bot WebSocket settings)
  * `endpoint` (default `/`)
  * `password` (optional, if auth enabled)
  * `scheme`: `ws` / `wss` (default `ws`) ([streamerbot.github.io][4])
* “Connect / Disconnect” button + connection status indicator.
* Auto-connect on panel mount (toggle).
* Auto-reconnect with backoff + retry limit (default infinite). ([streamerbot.github.io][4])
* Clear error display (auth failed, refused, timeout, etc.).
* Ability to subscribe only to needed events (avoid `*`). ([docs.streamer.bot][5])

#### 6.2 Event ingestion (MVP)

* Subscribe to at least:

  * `Twitch.ChatMessage` ([docs.streamer.bot][5])
* Store normalized message objects:

  * id (unique), timestamp, platform, channel/account, username, displayName, message text, metadata (badges/roles if provided), raw payload for debugging.

> Note: Streamer.bot docs show the event naming pattern `Source.Type` and using `client.on()` handlers. ([docs.streamer.bot][5])

#### 6.3 Rendering & UX (MVP)

* Message list:

  * chronological, newest at bottom
  * optional “auto-scroll” toggle (stick to bottom)
  * “pause scroll” when user scrolls up
* Visual grouping:

  * platform icon (Twitch now; extensible)
  * username + message content
  * timestamp (toggle)
* Filtering:

  * text search
  * platform filter (even if only Twitch in v1, keep structure)
* Highlighting:

  * keyword-based highlight rules (user-defined)
  * highlight for roles (mod/broadcaster) if available in payload

#### 6.4 Persistence

* Persist settings in local storage:

  * host/port/endpoint/scheme/autoconnect
  * **password persistence OFF by default** (toggle “remember password”).
* Persist UI preferences:

  * font size, compact mode, timestamps toggle, highlight rules.

---

### 7) Technical requirements

#### 7.1 Platform / runtime

* Runs inside OBS dock (Chromium/CEF) and standard Chrome.
* Next.js client-side component for the chat panel (no server dependency required).

#### 7.2 Library choice

* Use `@streamerbot/client` in the browser bundle (pnpm). ([streamerbot.github.io][1])
* Use `client.on(eventName, handler)` for subscriptions; optionally set `subscribe` on connect for tighter control. ([docs.streamer.bot][5])
* If Streamer.bot WebSocket auth is enabled, pass `password`; the client handles auth steps automatically. ([docs.streamer.bot][6])

#### 7.3 LAN & mixed-content constraints

* If the panel is served from `https://`, browsers may block `ws://` to non-localhost; keep default panel hosting **[http://localhost](http://localhost)** for OBS dock use. ([docs.streamer.bot][2])
* Provide optional `wss://` support via `scheme: 'wss'` when the user uses a secure tunnel/reverse proxy. ([streamerbot.github.io][4])

#### 7.4 Compatibility risk (OBS)

* Track OBS/CEF compatibility: there is an open issue indicating potential WebCrypto `digest` problems “only when loading through OBS” for this client. Mitigation plan:

  * Document minimum OBS version requirement.
  * Provide fallback mode (custom lightweight WS client) if `@streamerbot/client` fails in a given OBS build. ([GitHub][7])

#### 7.5 Performance

* Virtualize message list (large chat volume).
* Keep bounded in-memory buffer (e.g., last 2,000 messages; configurable).
* Avoid heavy parsing in render loop; normalize once on ingestion.

---

### 8) Security & privacy

* Default to localhost-only; warn when host is non-local (LAN exposure).
* Encourage Streamer.bot WebSocket authentication usage; do not log secrets. ([docs.streamer.bot][6])
* If “remember password” is enabled:

  * store locally with clear UI warning (“stored on this machine”).
* Provide a “redact logs” toggle for debug panels.

---

### 9) UX deliverables

* Chat Panel (dock tab):

  * header: connection status + connect/disconnect + settings shortcut
  * toolbar: search, filters, autoscroll, clear
  * main: virtualized message list
* Settings Modal:

  * connection section
  * display preferences
  * highlight rules
  * diagnostics (last error, last event received)

---

### 10) Acceptance criteria (MVP)

* Can connect to a local Streamer.bot instance and render Twitch messages using `Twitch.ChatMessage`.
* Auto-reconnect works after Streamer.bot restart.
* No reliance on external web pages (no iframe).
* Message list remains responsive after 1,000+ messages (virtualized + bounded buffer).
* Settings persist across restarts (except password unless explicitly enabled).

---

### 11) Phased roadmap

**MVP (v1)**

* Twitch.ChatMessage rendering + filters + stable reconnect + persistence.

**v1.1**

* Multi-platform support (YouTube/Trovo) using same event pattern. ([docs.streamer.bot][3])

**v1.2**

* Optional “send message” (requires auth for SendMessage request). ([docs.streamer.bot][6])

**v2**

* Command/autocomplete UX inspired by Streamer.bot Chat (slash/emote menus). ([docs.streamer.bot][3])

[1]: https://streamerbot.github.io/client/get-started/installation/ "Installation | Streamer.bot WebSocket Client"
[2]: https://docs.streamer.bot/api/websocket/recipes/remote-access "Remote Access | Streamer.bot Docs"
[3]: https://docs.streamer.bot/guide/extra-features/chat "Streamer.bot Chat | Streamer.bot Docs"
[4]: https://streamerbot.github.io/client/api/config/ "Configuration | Streamer.bot WebSocket Client"
[5]: https://docs.streamer.bot/api/websocket/guide/client "Using the Client | Streamer.bot Docs"
[6]: https://docs.streamer.bot/api/websocket/guide/authentication "Authentication | Streamer.bot Docs"
[7]: https://github.com/Streamerbot/client/issues "GitHub · Where software is built"

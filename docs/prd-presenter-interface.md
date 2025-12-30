# PRD — Presenter Dashboard (Integrated into OBS Suite)

## 0) Context

This feature is a **module inside the existing OBS Suite** (Next.js + Dockview). It’s a **private presenter dashboard** used during Twitch shows:

* **Return video** via **VDO.Ninja (online)** embedded in an iframe (local self-host later).
* **Private control-room ↔ presenter cues/chat** with rich cards + acknowledgements.
* **Twitch chat ** (iframe from streamer.bot)

Mobile view :
Horizontal and vertical view. Split private chat and public chat. (no place for video)

Tablet view / desktop view :
Horizontal. 
Left Pane : Split --> top : video, bottom : private chat
Right Pane : public chat

---

## 1) Goals

* Fit naturally into OBS Suite’s Dockview-based workflow (panels, layouts, persistence).
* Provide real-time cues that are **actionable**, **typed**, and **low-latency**.
* Keep UX “live-show friendly”: large, legible, minimal clicks, clear urgency.

### Non-goals (v1)

* Replacing Twitch chat UI fully inside this module.
* Offline mode / local VDO.Ninja hosting (later).
* Full moderation / thread model.

---

## 2) Users & Roles

* **Presenter (Client A)**: consumes cues, acknowledges, sends short replies.
* **Control Room Operator (Client B)**: sends cues, pins items, promotes questions, monitors ack states.
* Optional: **Producer** with send/view permissions.

---

## 3) Product Surface in OBS Suite

### 3.1 Dockview Panels (proposed)

1. **Presenter Return (VDO.Ninja)**

   * iframe panel with controls (mute/refresh/fullscreen-in-panel).
2. **Cue Feed (Private)**

   * list + pinned section + action buttons (ack/done/take/skip).
3. **Cue Composer (Control Room)**

   * quick templates + type selector + pin + send.
4. **Presence / Status**

   * presenter online/offline, last seen, WS status, counters (urgent unacked).

### 3.2 Layout & Persistence

* Panels can be arranged in Dockview; layout saved per user profile (existing OBS Suite pattern).
* “Show Mode” preset layout: return video left, cues right, composer bottom (example).

---

## 4) Functional Requirements

### 4.1 Return Video (VDO.Ninja iframe)

* Embed VDO.Ninja via iframe URL params (provided by control room).
* UI controls:

  * Refresh iframe
  * Mute/unmute (best-effort; iframe limitations apply)
  * “Open in new tab” fallback
* Status indicator:

  * “Loaded / Error / Manual refresh needed”
* Note: No assumption of shared WebRTC tunnel for chat in v1.

### 4.2 Private Cue System (Core)

Cues are structured messages rendered as rich cards.

**Must-have message types**

* `cue` (info/warn/urgent)
* `countdown` (ad break / segment timing)
* `question` (promoted from Twitch chat)
* `context` (image + bullet points + links)
* `note` (freeform text)

**Card behaviors**

* Pin/unpin (control room)
* Acknowledge:

  * `seen` (auto when visible) + explicit `ack` button (“OK”)
* Resolve:

  * `done` / `clear` (control room or presenter depending on permissions)
* For questions:

  * Presenter action: `take` / `skip`

### 4.3 Presenter → Control Room Quick Replies

* A small “send” box + configurable quick buttons:

  * “Ready”
  * “Need more context”
  * “Delay 1 min”
  * “Audio issue”
* Replies appear in the same room feed (typed as `reply`).

### 4.4 Real-time Transport

* WebSocket rooms (server authoritative).
* Requirements:

  * reconnection with replay since last cursor
  * idempotent message handling
  * ordering within a room
  * presence (online/offline, last activity)

### 4.5 Integrations

**Twitch chat highlights input (v1)**

* External tool (Streamer.bot or control script) sends “promote question” events into the backend.
* Backend converts to `question` messages for the room.

(Direct Twitch API ingestion can be deferred.)

---

## 5) Data Model (v1)

All room messages are JSON objects.

**Common fields**

* `id` (uuid)
* `roomId`
* `type`
* `createdAt`
* `from` (`control|presenter|system`)
* `severity` (`info|warn|urgent`, optional)
* `title` (optional)
* `body` (markdown-lite or structured blocks)
* `pin` (bool)
* `actions[]` (predefined action ids only)

**Type-specific**

* `countdown`: `{ mode: "duration"|"targetTime", durationSec?, targetTime? }`
* `context`: `{ imageUrl?, links?: {url,title?}[], bullets?: string[] }`
* `question`: `{ platform:"twitch", author, text, messageUrl? }`

**Rendering rules**

* No raw HTML from users.
* Strict sanitization for markdown rendering.
* Links open in new tab with safe attributes.

---

## 6) Security & Access Control

* Private access within OBS Suite auth model.
* Room access via:

  * user role (presenter/control) + room membership
* Optional “quick join” via room token (rotatable) if you need ultra-fast onboarding.
* Rate limiting on inbound integrations (Streamer.bot pushes).

---

## 7) Technical Integration in Next.js (High Level)

* UI: Next.js pages/components mounted inside OBS Suite shell; panels are Dockview entries.
* Backend:

  * Either a dedicated WS server alongside Next.js runtime, or a Next.js-compatible WS endpoint (depends on your deployment target).
  * Message persistence: lightweight DB (SQLite/Postgres) or existing store used in OBS Suite.
* Configuration:

  * “Show profile” config: roomId, VDO.Ninja URL, quick buttons, templates.

---

## 8) MVP Scope

* Dockview panels:

  * VDO.Ninja iframe panel
  * Cue Feed panel (pin + ack + done + question actions)
  * Cue Composer panel (control role)
* WS backend:

  * rooms, presence, replay, persistence (last N messages)
* Integration endpoint:

  * “promote question” (authenticated webhook) → creates `question` message

---

## 9) Later

* Local VDO.Ninja hosting + deeper integration
* Upload images (store + CDN/local) instead of URL-only
* Hard “urgent overlay” mode
* Multi-presenter rooms
* OBS/QLC+/Voicemeeter triggers (cue → automation)

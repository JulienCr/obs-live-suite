# Presenter Dashboard Implementation Plan

## 🎯 Implementation Status: 90% Complete

**Core MVP implementation is DONE.** Remaining work is database initialization and testing.

## Overview

Implemented a Presenter Dashboard module for OBS Live Suite at `/presenter` with:
- ✅ VDO.Ninja return video (iframe)
- ✅ Private cue messaging between control room and presenter
- ✅ Twitch chat integration (iframe)
- ✅ Responsive layout (mobile/tablet/desktop)
- ✅ Real-time WebSocket communication with presence tracking
- ✅ Message replay on reconnection
- ✅ Control room panels for sending cues

## User Decisions
- **Separate route** at `/presenter` ✅
- **Extend ChannelManager** for room-based messaging ✅
- **Responsive design** with CSS breakpoints ✅
- **No auth for MVP** (local network only) ✅

---

## Phase 1: Data Models

### 1.1 Create `/lib/models/Room.ts`
```typescript
// RoomSchema: id, name, vdoNinjaUrl, twitchChatUrl, quickReplies[], timestamps
// RoomPresenceSchema: roomId, clientId, role (presenter|control|producer), isOnline, lastSeen
```

### 1.2 Create `/lib/models/Cue.ts`
```typescript
// Enums: CueSeverity (info|warn|urgent), CueType (cue|countdown|question|context|note|reply)
// CueFrom (control|presenter|system), CueAction (ack|done|clear|take|skip|pin|unpin)
// Payloads: CountdownPayload, ContextPayload, QuestionPayload
// CueMessageSchema: id, roomId, type, from, severity, title, body, pinned, actions[],
//   type-specific payloads, seenBy[], ackedBy[], resolved state, timestamps
```

---

## Phase 2: Database

### 2.1 Add tables in `DatabaseService.ts` → `initializeTables()`

**rooms table:**
- id, name, vdoNinjaUrl, twitchChatUrl, quickReplies (JSON), timestamps

**cue_messages table:**
- id, roomId (FK), type, fromRole, severity, title, body, pinned
- countdownPayload, contextPayload, questionPayload (JSON)
- seenBy, ackedBy (JSON arrays), resolvedAt, resolvedBy, timestamps
- Indexes: roomId, createdAt, pinned

### 2.2 Add CRUD methods
- `getAllRooms()`, `getRoomById()`, `createRoom()`, `updateRoom()`, `deleteRoom()`
- `getMessagesByRoom(roomId, limit, cursor)`, `getPinnedMessages(roomId)`
- `createMessage()`, `updateMessage()`, `deleteMessage()`, `deleteOldMessages()`

---

## Phase 3: WebSocket Extensions

### 3.1 Extend `lib/models/OverlayEvents.ts`
- Add room event types: `RoomEventType` enum (join, leave, message, action, presence)
- Add room message schemas

### 3.2 Extend `lib/services/ChannelManager.ts`
```typescript
// Room channel naming: `room:${roomId}`
publishToRoom(roomId: string, type: string, payload?: unknown): Promise<void>
getRoomSubscribers(roomId: string): number
```

### 3.3 Extend `lib/services/WebSocketHub.ts`
- Add to WSClient: `roomId`, `role`, `lastActivity`
- Track presence: `roomPresence: Map<string, Map<string, RoomPresence>>`
- Handle new message types: `join-room`, `leave-room`, `cue-action`, `presence-ping`
- Add methods: `getPresence(roomId)`, `broadcastPresence(roomId)`
- On `join-room`: subscribe + send message replay (last 50 + pinned)

---

## Phase 4: Backend API

### 4.1 Create `/server/api/rooms.ts`
```
GET    /api/rooms           - List all rooms
POST   /api/rooms           - Create room
GET    /api/rooms/:id       - Get room
PUT    /api/rooms/:id       - Update room
DELETE /api/rooms/:id       - Delete room
GET    /api/rooms/:id/presence - Get presence
```

### 4.2 Create `/server/api/cue.ts`
```
POST   /api/cue/send              - Send cue to room
GET    /api/cue/:roomId/messages  - Get messages (cursor pagination)
POST   /api/cue/:messageId/action - Perform action (ack, done, pin, etc.)
POST   /api/cue/promote-question  - Webhook for Streamer.bot
```

### 4.3 Register routes in `server/backend.ts`

---

## Phase 5: Presenter UI

### 5.1 Create route structure
- `/app/presenter/page.tsx` - Main page
- `/app/presenter/layout.tsx` - Minimal layout (no sidebar)

### 5.2 Create `/components/presenter/PresenterShell.tsx`
- Responsive layout with Tailwind breakpoints
- Mobile (< 768px): Private chat + Twitch chat stacked, no video
- Tablet/Desktop (>= 768px): Left (video + cues + replies), Right (Twitch chat)
- WebSocket connection via custom hook

### 5.3 Create `/components/presenter/hooks/usePresenterWebSocket.ts`
- Connect to `room:${roomId}` channel
- Handle message replay on connect
- Track presence, provide action handlers
- Reconnection with cursor-based replay
- Idempotent message handling

### 5.4 Create presenter panels
- `/components/presenter/panels/VdoNinjaPanel.tsx` - iframe + controls (refresh, mute, open new tab)
- `/components/presenter/panels/CueFeedPanel.tsx` - Pinned section + scrollable feed
- `/components/presenter/panels/QuickReplyPanel.tsx` - Quick buttons + custom input
- `/components/presenter/panels/TwitchChatPanel.tsx` - iframe embed
- `/components/presenter/CueCard.tsx` - Card component by type with actions

---

## Phase 6: Control Room UI

### 6.1 Create `/components/shell/panels/CueComposerPanel.tsx`
- Type selector, severity, title, body (markdown)
- Type-specific fields (countdown duration, context image, etc.)
- Pin toggle, quick templates, send button

### 6.2 Create `/components/shell/panels/PresenceStatusPanel.tsx`
- Presenter online/offline indicator
- Last seen, unacked urgent count, WS status

### 6.3 Register in `components/shell/DashboardShell.tsx`
```typescript
const components = {
  // ... existing
  cueComposer: CueComposerPanel,
  presenceStatus: PresenceStatusPanel,
};
```

---

## Responsive Layout

### Mobile (< 768px)
```
+------------------------+
|  Private Chat Feed     |
|  + Quick Reply Bar     |
+------------------------+
|  Twitch Chat (iframe)  |
+------------------------+
```

### Tablet/Desktop (>= 768px)
```
+------------------+---------------+
|   VDO.Ninja      |               |
|   (iframe)       |  Twitch Chat  |
+------------------+  (iframe)     |
|  Private Cues    |               |
|  + Quick Reply   |               |
+------------------+---------------+
```

---

## Implementation Status

### ✅ COMPLETED
1. **Phase 1**: Create Zod models (`Room.ts`, `Cue.ts`) ✅
2. **Phase 2**: Add database tables and CRUD methods ✅
3. **Phase 3**: Extend OverlayEvents, ChannelManager, WebSocketHub ✅
4. **Phase 4**: Create backend API routes ✅
5. **Phase 5**: Build presenter UI (shell, hook, panels) ✅
6. **Phase 6**: Build control room panels ✅
7. **Phase 7**: Create Next.js API proxy routes ✅
8. **Phase 8**: Register panels in DashboardShell ✅
9. **Phase 9**: Fix type errors for presenter implementation ✅

### 🔄 REMAINING TASKS

#### 1. Database Initialization
Create a default room on first run so the presenter dashboard works out of the box:
- Add room creation to seed data or initialization
- Default room ID: "default"
- Default name: "Main Room"
- Empty VDO.Ninja and Twitch Chat URLs (user can configure later)

#### 2. Testing & Validation
- **Manual testing**: Start backend server, open presenter dashboard at `/presenter?room=default`
- **Test WebSocket connection**: Verify presenter can connect to room
- **Test control room**: Open dashboard, add Cue Composer and Presence Status panels
- **Test messaging**: Send cues from control room, verify they appear in presenter view
- **Test actions**: Acknowledge cues, pin/unpin, mark as done
- **Test presence**: Verify presence indicators update correctly

#### 3. Documentation (Optional)
Create brief usage guide:
- How to access presenter dashboard (`/presenter?room=default&role=presenter`)
- How to add control panels to dashboard (Cue Composer, Presence Status)
- How to configure VDO.Ninja and Twitch Chat URLs
- Webhook endpoint for Streamer.bot: `POST /api/cue/promote-question`

---

## Files Created & Modified

### ✅ New Files Created (18 files)

**Data Models**
- `lib/models/Room.ts` - Room & presence schemas
- `lib/models/Cue.ts` - Cue message schemas with actions

**Backend API**
- `server/api/rooms.ts` - Room CRUD endpoints
- `server/api/cue.ts` - Cue messaging endpoints

**Presenter UI**
- `app/presenter/page.tsx` - Presenter route
- `app/presenter/layout.tsx` - Minimal layout
- `components/presenter/PresenterShell.tsx` - Main shell component
- `components/presenter/hooks/usePresenterWebSocket.ts` - WebSocket hook
- `components/presenter/CueCard.tsx` - Message card component
- `components/presenter/panels/VdoNinjaPanel.tsx` - Video return panel
- `components/presenter/panels/CueFeedPanel.tsx` - Cue feed panel
- `components/presenter/panels/QuickReplyPanel.tsx` - Quick reply panel
- `components/presenter/panels/TwitchChatPanel.tsx` - Twitch chat panel

**Next.js API Proxy**
- `app/api/presenter/rooms/route.ts` - Rooms proxy
- `app/api/presenter/rooms/[id]/route.ts` - Room detail proxy
- `app/api/presenter/cue/send/route.ts` - Send cue proxy
- `app/api/presenter/cue/[messageId]/action/route.ts` - Cue action proxy

**Control Room Panels**
- `components/shell/panels/CueComposerPanel.tsx` - Cue composer
- `components/shell/panels/PresenceStatusPanel.tsx` - Presence status

### ✅ Files Modified (6 files)

- `lib/models/OverlayEvents.ts` - Added room event types
- `lib/models/Database.ts` - Added DbRoom, DbCueMessage types
- `lib/services/DatabaseService.ts` - Added rooms/cue_messages tables + CRUD
- `lib/services/ChannelManager.ts` - Added room publish methods
- `lib/services/WebSocketHub.ts` - Added room joining, presence, replay
- `server/backend.ts` - Registered new routes
- `components/shell/DashboardShell.tsx` - Registered new panels

---

## Patterns to Follow

- **Panel pattern**: Wrapper with `IDockviewPanelProps` (see `LowerThirdPanel.tsx`)
- **WebSocket client**: Connect → subscribe → handle → ack (see `LowerThirdRenderer.tsx`)
- **Database CRUD**: Singleton, prepared statements, type conversion (see existing methods)
- **Zod schemas**: Input/Update variants, runtime validation (see `Guest.ts`)

# Architecture V2 - Clean Separation

## ✅ Correct Architecture (Microservices)

```
┌──────────────────────────────────────────────────────────────────────┐
│                            Browser                                    │
│                                                                       │
│  Overlay Pages:                                                      │
│  - /overlays/lower-third    ─┐                                      │
│  - /overlays/countdown       ├─ Server-Sent Events (SSE)            │
│  - /overlays/poster         ─┘  for real-time updates               │
│                                                                       │
│  Dashboard:                                                          │
│  - /dashboard               ─── Polling (every 1s)                   │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              │ HTTP / SSE
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│                       Next.js (Port 3000)                            │
│                        PURE UI LAYER                                 │
│                                                                       │
│  Responsibilities:                                                   │
│  ✅ Server-Side Rendering (SSR)                                      │
│  ✅ Static page generation                                           │
│  ✅ API routes = HTTP proxies ONLY                                   │
│  ✅ SSE endpoints for real-time updates                              │
│                                                                       │
│  Does NOT have:                                                      │
│  ❌ Database access                                                  │
│  ❌ OBS connection                                                   │
│  ❌ Business logic                                                   │
│  ❌ WebSocket server                                                 │
│                                                                       │
│  API Routes (All are proxies):                                       │
│  - POST /api/overlays/lower  ────┐                                  │
│  - POST /api/overlays/countdown  ├─ Forward to Backend              │
│  - GET  /api/obs/status         ─┘                                  │
│                                                                       │
│  SSE Routes:                                                         │
│  - GET /api/events/overlays  ──── Polls backend, streams to browser │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              │ HTTP REST API
                              ↓
┌──────────────────────────────────────────────────────────────────────┐
│                    Backend Service (Port 3002)                        │
│                      BUSINESS LOGIC LAYER                            │
│                                                                       │
│  Responsibilities:                                                   │
│  ✅ OBS WebSocket connection (single instance)                       │
│  ✅ Database (SQLite)                                                │
│  ✅ Channel Manager (internal pub/sub)                               │
│  ✅ Macro Engine                                                     │
│  ✅ All business logic                                               │
│                                                                       │
│  REST API Endpoints:                                                 │
│  - POST /api/overlays/lower                                          │
│  - POST /api/overlays/countdown                                      │
│  - POST /api/overlays/poster                                         │
│  - GET  /api/obs/status                                              │
│  - POST /api/obs/stream                                              │
│  - POST /api/obs/record                                              │
│  - GET  /api/events/stream ─── SSE endpoint for overlay updates     │
│                                                                       │
│  Internal Components:                                                │
│  - WebSocketHub (internal use only, NO external clients)            │
│  - ChannelManager (pub/sub for internal messaging)                  │
│  - OBSConnectionManager (single WebSocket to OBS)                   │
└─────────────────────────────┬────────────────────────────────────────┘
                              │
                              │ WebSocket (obs-websocket protocol)
                              ↓
                        ┌─────────────┐
                        │  OBS Studio │
                        └─────────────┘
```

## Key Changes

### 1. Browser → Next.js Communication

**Before (Bad):**
```javascript
// Browser directly connects to WebSocket
const ws = new WebSocket('ws://localhost:3001');
```

**After (Good):**
```javascript
// Browser uses SSE through Next.js
const eventSource = new EventSource('/api/events/overlays');
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Handle overlay updates
};
```

### 2. Next.js API Routes

**Before (Bad):**
```typescript
// Next.js had business logic
import { ChannelManager } from '@/lib/services/ChannelManager';
const manager = ChannelManager.getInstance();
await manager.publishLowerThird(...);
```

**After (Good):**
```typescript
// Next.js is pure proxy
const response = await fetch(`${BACKEND_URL}/api/overlays/lower`, {
  method: 'POST',
  body: JSON.stringify(body)
});
return NextResponse.json(await response.json());
```

### 3. Backend Server

**Responsibilities:**
- ✅ Single source of truth for all state
- ✅ Owns database connection
- ✅ Owns OBS connection
- ✅ Exposes REST API
- ✅ Provides SSE endpoint for real-time updates

## Benefits

| Feature | Before | After |
|---------|--------|-------|
| **Architecture** | Monolithic | Microservices |
| **WebSocket Clients** | Multiple (browser direct) | Zero (internal only) |
| **Next.js Role** | Business logic + UI | UI only |
| **Backend Role** | Mixed in Next.js | Standalone service |
| **HMR Issues** | ❌ Port conflicts | ✅ No issues |
| **Scalability** | ❌ Coupled | ✅ Independent scaling |
| **Testing** | ❌ Hard | ✅ Easy (API contracts) |
| **Deployment** | ❌ Monolithic | ✅ Separate services |

## Implementation Checklist

### Backend (Port 3002)
- [x] Express server setup
- [x] CORS configuration
- [x] REST API routes (`/api/overlays/*`, `/api/obs/*`)
- [ ] SSE endpoint (`/api/events/stream`)
- [x] OBS connection (single instance)
- [x] Database access
- [x] ChannelManager (internal pub/sub)
- [ ] Remove external WebSocket server (keep internal only)

### Next.js (Port 3000)
- [x] Proxy routes for overlays
- [x] Proxy routes for OBS
- [ ] SSE endpoint for browser (`/api/events/overlays`)
- [ ] Remove all service imports
- [ ] Remove instrumentation.ts business logic
- [ ] Pure UI rendering only

### Browser
- [ ] Replace WebSocket with EventSource (SSE)
- [ ] Update overlay components
- [ ] Update dashboard polling

## Migration Steps

1. ✅ Create backend server with Express
2. ✅ Move all API logic to backend
3. ⏳ Update Next.js routes to proxies
4. ⏳ Add SSE endpoints
5. ⏳ Update browser to use SSE
6. ⏳ Remove WebSocket from overlays
7. ⏳ Test end-to-end

## File Structure

```
project/
├── server/                    # Backend Service
│   ├── backend.ts            # Main server
│   └── api/
│       ├── overlays.ts       # Overlay control API
│       ├── obs.ts            # OBS control API
│       └── events.ts         # SSE endpoint
│
├── app/                       # Next.js UI
│   ├── api/                  # Proxy routes only
│   │   ├── overlays/*/route.ts
│   │   ├── obs/*/route.ts
│   │   └── events/*/route.ts  # SSE proxy
│   ├── dashboard/page.tsx
│   └── overlays/*/page.tsx
│
└── lib/                       # Shared types/models only
    └── models/                # TypeScript interfaces
```

## Testing

```bash
# Terminal 1: Backend
pnpm run backend

# Terminal 2: Next.js
pnpm run dev:frontend

# Test backend directly
curl http://localhost:3002/health

# Test through Next.js proxy
curl http://localhost:3000/api/obs/status

# Open browser
http://localhost:3000/overlays/lower-third
```

---

**Status:** 🚧 In Progress  
**Next Step:** Complete SSE implementation


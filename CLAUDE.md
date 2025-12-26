# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OBS Live Suite is a Next.js application for managing live show overlays with real-time control, OBS integration, and Stream Deck support. It features a dual-process architecture:
- **Frontend**: Next.js 15+ (App Router) on port 3000
- **Backend**: Express server on port 3002 with WebSocket hub on port 3003

## Development Commands

### Start Development (Most Common)
```bash
pnpm dev
```
Runs both frontend (Next.js watch) and backend (tsx watch) concurrently. **IMPORTANT**: Never build without authorization - dev mode has watch enabled.

### Individual Services
```bash
pnpm dev:frontend    # Next.js dev server only
pnpm dev:backend     # Backend server only
pnpm backend         # Backend without watch
```

### Testing
```bash
pnpm test                    # Unit tests (Jest)
pnpm test:watch             # Unit tests in watch mode
pnpm test:coverage          # Coverage report
pnpm test:functional        # Functional tests for lower third
pnpm test:functional:ui     # Dashboard UI tests
pnpm test:all              # All tests
```

### Type Checking & Linting
```bash
pnpm type-check    # TypeScript validation
pnpm lint          # ESLint
```

### Production
```bash
pnpm build         # Safe build (checks TypeScript first)
pnpm build:direct  # Direct Next.js build
pnpm pm2:start     # Start with PM2
pnpm pm2:stop      # Stop PM2 processes
pnpm pm2:restart   # Restart PM2
pnpm pm2:logs      # View logs
pnpm pm2:status    # Check status
```

### Utilities
```bash
pnpm streamdeck:ids    # List Stream Deck action IDs
```

## Architecture

### Dual-Process Design
- **Next.js Frontend** (port 3000): UI, API routes, server actions
- **Express Backend** (port 3002): HTTP API for message publishing
- **WebSocket Hub** (port 3003): Real-time overlay updates

The backend runs independently to ensure WebSocket and OBS connections persist even during Next.js hot-reloading.

### Key Patterns

**Singleton Services**: Most services use getInstance() pattern:
- `DatabaseService` - SQLite connection
- `WebSocketHub` - WebSocket server
- `ChannelManager` - Pub/sub for overlays
- `OBSConnectionManager` - OBS WebSocket connection
- `AppConfig`, `PathManager` - Configuration

**Event-Driven**: Overlays use pub/sub via ChannelManager:
```
Dashboard → API Route → ChannelManager.publish() → WebSocket → Overlay
```

**Service Layers**:
- `lib/adapters/` - External integrations (OBS WebSocket)
- `lib/services/` - Business logic (DatabaseService, MacroEngine, QuizManager)
- `lib/models/` - Zod schemas and types
- `lib/utils/` - Pure utilities
- `server/api/` - Backend Express routes
- `app/api/` - Next.js API routes

### Data Storage
- **Database**: SQLite via better-sqlite3 in `~/.obs-live-suite/data.db`
- **Assets**: `~/.obs-live-suite/uploads/` (guests, posters, quiz images)
- **Logs**: `~/.obs-live-suite/app.log`
- **Backups**: `~/.obs-live-suite/backups/`

Paths managed by `PathManager.getInstance()`.

### Communication Flow

**Dashboard → Overlays**:
1. POST to `/api/overlays/{type}`
2. ChannelManager publishes event
3. WebSocket broadcasts to overlay pages
4. Overlays update and send acknowledgment

**Dashboard → OBS**:
1. POST to `/api/obs/{action}`
2. OBSConnectionManager sends command
3. OBSStateManager tracks state changes

**Stream Deck → App**:
1. POST to `/api/actions/{action}` (simple) OR
2. Native plugin via HTTP API (recommended)

## TypeScript Paths
```json
{
  "@/*": "./*",
  "@/lib/*": "./lib/*",
  "@/components/*": "./components/*",
  "@/app/*": "./app/*"
}
```

## Testing Structure
- `__tests__/api/` - API route tests
- `__tests__/components/` - React component tests
- `__tests__/models/` - Data model tests
- `__tests__/services/` - Service layer tests
- `__tests__/integration/` - End-to-end tests
- `__tests__/functional/` - Functional overlay tests
- `scripts/test-*.js` - Standalone test scripts

Test environment defaults to Node. For React components, use `@testing-library/react` with jsdom.

## OBS Integration
- Requires OBS Studio with obs-websocket v5 enabled
- Credentials in `.env`: `OBS_WS_URL`, `OBS_WS_PASSWORD`
- Connection managed by `OBSConnectionManager` with auto-reconnect
- State tracking via `OBSStateManager`
- Controllers: `OBSSceneController`, `OBSSourceController`

## Overlays
Browser source URLs for OBS (size: 1920x1080):
- Lower Third: `http://localhost:3000/overlays/lower-third`
- Countdown: `http://localhost:3000/overlays/countdown`
- Poster: `http://localhost:3000/overlays/poster`

Each overlay connects to WebSocket hub and subscribes to its channel.

## Theming System
- Managed by `ThemeService`
- 16:9 canvas preview with drag-and-drop positioning
- Theme models: colors, fonts, templates, scale, position
- Pre-built themes in seed data
- Applied to active profile via `/api/themes/{id}` endpoints

## PM2 Deployment
`ecosystem.config.cjs` defines two apps:
- `obs-backend`: Express + WebSocket (port 3002/3003)
- `obs-frontend`: Next.js server (port 3000)

Both use fork mode with autorestart and memory limits.

## Important Notes
- **Never build** without explicit user authorization (per CLAUDE.md user instructions)
- Use `pnpm` (not npm/yarn)
- Node.js 20+ required
- Database auto-initializes on first run via `ServerInit.ts`
- Logger configured via `Logger.setLogFilePath()` before use
- Follow `.cursor/rules/documentation.mdc` guidelines (prefer executable clarity over prose)

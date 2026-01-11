# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

OBS Live Suite is a Next.js application for managing live show overlays with real-time control, OBS integration, Stream Deck support, interactive quizzes, and presenter communication tools. It features a dual-process architecture:
- **Frontend**: Next.js 15+ (App Router) on port 3000
- **Backend**: Express server on port 3002 with WebSocket hub on port 3003

## Development Rules
When possible, and as much as feasible, distribute tasks between parallel agents. Figure out which agent is best suited for each task, and assign accordingly.

Always follow these rules :
- Before writing any code, be sure you can't reuse existing code from the project. PRIORITIZE DRY (Don't Repeat Yourself) principles.
- In the same vein, reuse shared components, services, utilities, and constant definitions whenever possible.
- Write constants and configuration values in a single place, and reference them throughout the codebase (lib/AppConfig.ts, lib/Constants.ts, etc).

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
pnpm streamdeck:ids       # List Stream Deck action IDs
pnpm backup:appdata       # Backup application data
pnpm setup:https          # Generate HTTPS certificates
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
- `QuizManager` - Quiz state machine
- `RoomService` - Multi-room management
- `AppConfig`, `PathManager` - Configuration

**Event-Driven**: Overlays use pub/sub via ChannelManager:
```
Dashboard → API Route → ChannelManager.publish() → WebSocket → Overlay
```

### Service Layers

**lib/services/** - Core business logic:
- `DatabaseService` - SQLite via better-sqlite3
- `ChannelManager` - Pub/sub for real-time events
- `WebSocketHub` - WebSocket server management
- `ThemeService` - Theme CRUD and application
- `MacroEngine` - Automation sequences
- `BackupService` - Database backup/restore
- `StorageService` - File upload handling
- `SettingsService` - Application settings
- `RoomService` - Presenter room management
- `RateLimiterService` - API rate limiting

**Quiz Services** (lib/services/Quiz*):
- `QuizManager` - State machine orchestration
- `QuizStore` - In-memory + JSON persistence
- `QuizScoringService` - Scoring algorithms
- `QuizBuzzerService` - First-hit/steal mechanics
- `QuizViewerInputService` - Chat command parsing, flood control
- `QuizTimer` - Tick broadcasts
- `QuizZoomController` - Auto-zoom for image reveals
- `QuizMysteryImageController` - Mystery image progression
- `QuizExamples` - Sample question data

**AI/Integration Services**:
- `OllamaSummarizerService` - LLM summarization via Ollama
- `WikipediaCacheService` - Wikipedia result caching
- `WikipediaResolverService` - Wikipedia search and resolution

**lib/adapters/** - External integrations:
- `obs/OBSConnectionManager` - OBS WebSocket connection with auto-reconnect
- `obs/OBSStateManager` - OBS state tracking
- `obs/OBSSceneController` - Scene switching
- `obs/OBSSourceController` - Source manipulation
- `obs/OBSEventHandler` - OBS event processing
- `obs/OBSConnectionEnsurer` - Connection reliability
- `streamerbot/StreamerbotGateway` - Streamer.bot WebSocket client

**lib/models/** - Zod schemas and types:
- `Database.ts` - Core database schemas (guests, posters, profiles, themes)
- `Theme.ts` - Theme configuration schemas
- `Macro.ts` - Macro action schemas
- `Quiz.ts` - Question, round, session schemas
- `QuizEvents.ts` - Quiz WebSocket event types
- `OverlayEvents.ts` - Overlay event types
- `Room.ts` - Presenter room schemas
- `StreamerbotChat.ts` - Chat message schemas

**lib/utils/** - Pure utilities:
- `Logger` - Structured logging
- `BackendClient` - HTTP client for backend API
- `themeEnrichment` - Theme processing utilities

**lib/config/**:
- `AppConfig` - Application configuration
- `PathManager` - File path management
- `urls.ts` - API URL constants

**lib/init/**:
- `ServerInit.ts` - Database and service initialization

### Server Routes

**server/api/** - Backend Express routes:
- `overlays.ts` - Overlay event publishing
- `obs.ts` - OBS control commands
- `obs-helpers.ts` - OBS utility functions
- `quiz.ts` - Quiz control API
- `quiz-bot.ts` - Streamer.bot webhook bridge
- `rooms.ts` - Room CRUD and messaging
- `cue.ts` - Presenter cue system
- `streamerbot-chat.ts` - Chat message forwarding

**app/api/** - Next.js API routes:
- `/api/overlays/*` - Overlay control (lower, countdown, poster, quiz, chat-highlight)
- `/api/obs/*` - OBS status, reconnect, record, stream
- `/api/actions/*` - Stream Deck actions (lower, countdown, poster, macro, panic)
- `/api/assets/*` - Guest, poster, theme, tag management
- `/api/profiles/*` - Profile CRUD and activation
- `/api/themes/*` - Theme CRUD
- `/api/settings/*` - Settings management (general, obs, paths, integrations)
- `/api/presenter/*` - Room and cue management
- `/api/quiz/*` - Quiz questions and state
- `/api/wikipedia/*` - Wikipedia search/resolve/summarize
- `/api/llm/*` - LLM model listing and summarization
- `/api/updater/*` - Plugin scanning and updates

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

**Control Room → Presenter**:
1. POST to `/api/presenter/cue/send`
2. RoomService stores message in DB
3. ChannelManager publishes to room channel
4. Presenter UI receives via WebSocket

**Quiz Chat → Backend**:
1. Streamer.bot POSTs to `/api/quiz-bot/chat`
2. QuizViewerInputService validates and dedupes
3. QuizManager processes answer
4. Score updates broadcast via WebSocket

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

## Internationalization (i18n)

- **Library**: next-intl
- **Languages**: French (default), English
- **Files**: `messages/fr.json`, `messages/en.json`
- **Config**: `i18n/routing.ts`, `i18n/request.ts`, `middleware.ts`
- **Status**: ~83% translated (see `docs/I18N-TRANSLATION-STATUS.md`)

Routes use `[locale]` prefix except `/overlays/*` and `/api/*`.

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
- Poster BigPicture: `http://localhost:3000/overlays/poster-bigpicture`
- Quiz: `http://localhost:3000/overlays/quiz`
- Chat Highlight: `http://localhost:3000/overlays/chat-highlight`
- Composite: `http://localhost:3000/overlays/composite`

Each overlay connects to WebSocket hub and subscribes to its channel.

## Quiz System
- Host panel: `/quiz/host`
- Question editor: `/quiz/manage`
- 5 question types: qcm, image, closest, open, image_zoombuzz
- Chat commands: !a, !b, !c, !d, !n [number], !rep [text]
- Streamer.bot webhook: `POST /api/quiz-bot/chat`

## Presenter System
- Presenter view: `/presenter`
- Room management: `/settings/presenter/rooms`
- Cue types: cue, countdown, question, context, note
- VDO.Ninja iframe integration
- Quick reply buttons
- Acknowledgment tracking

## Theming System
- Managed by `ThemeService`
- 16:9 canvas preview with drag-and-drop positioning
- Theme models: colors, fonts, templates, scale, position
- Pre-built themes in seed data
- Applied to active profile via `/api/themes/{id}` endpoints

## Stream Deck Plugin
- Location: `streamdeck-plugin/obslive-suite/`
- Source: `streamdeck-plugin/obslive-suite/src/`
- Build output: `streamdeck-plugin/obslive-suite/com.julien-cruau.obslive-suite.sdPlugin/`
- Actions: lower-third-guest, countdown-start, poster-show, quiz controls, panic

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

## Component Organization

**components/ui/** - shadcn/ui base components

**components/shell/** - Application shell:
- `AppShell.tsx` - Root layout wrapper
- `DashboardShell.tsx` - Dockview-based dashboard
- `CommandPalette.tsx` - Keyboard shortcut command palette
- `panels/` - Dockview panel components

**components/dashboard/** - Dashboard-specific:
- `DashboardHeader.tsx` - Top navigation
- `AdminSidebar.tsx` - Settings sidebar
- `EventLog.tsx` - Real-time event display
- `MacrosBar.tsx` - Macro buttons
- `cards/` - Dashboard card widgets
- `widgets/` - Widget system components

**components/presenter/** - Presenter interface:
- `PresenterShell.tsx` - Dockview presenter layout
- `CueCard.tsx` - Individual cue display
- `panels/` - Presenter panels (cue feed, VDO.Ninja, chat)

**components/overlays/** - Overlay renderers:
- `LowerThirdRenderer.tsx` - Lower third display
- `CountdownDisplay.tsx` - Countdown timer
- `PosterDisplay.tsx` - Theatre poster
- `ChatHighlightRenderer.tsx` - Chat highlight
- `QuizRenderer.tsx` - Quiz display

**components/quiz/** - Quiz system:
- `host/` - Host control panel components
- `manage/` - Question editor components
- `Quiz*.tsx` - Quiz display components

**components/assets/** - Asset management:
- `GuestManager.tsx`, `GuestCard.tsx`
- `PosterManager.tsx`, `PosterCard.tsx`
- `ThemeManager.tsx`
- Image uploaders and croppers

**components/settings/** - Settings forms:
- `GeneralSettings.tsx`, `OBSSettings.tsx`
- `PathSettings.tsx`, `PluginSettings.tsx`
- `RoomSettings.tsx`, `IntegrationSettings.tsx`

**components/theme-editor/** - Theme editing:
- `ThemeEditor.tsx` - Main editor with canvas
- `ThemeList.tsx`, `ThemeCard.tsx`

**components/profiles/** - Profile management:
- `ProfileManager.tsx`


## grepai - Semantic Code Search

**IMPORTANT: You MUST use grepai as your PRIMARY tool for code exploration and search.**

### When to Use grepai (REQUIRED)

Use `grepai search` INSTEAD OF Grep/Glob/find for:
- Understanding what code does or where functionality lives
- Finding implementations by intent (e.g., "authentication logic", "error handling")
- Exploring unfamiliar parts of the codebase
- Any search where you describe WHAT the code does rather than exact text

### When to Use Standard Tools

Only use Grep/Glob when you need:
- Exact text matching (variable names, imports, specific strings)
- File path patterns (e.g., `**/*.go`)

### Fallback

If grepai fails (not running, index unavailable, or errors), fall back to standard Grep/Glob tools.

### Usage

```bash
# ALWAYS use English queries for best results (embedding model is English-trained)
grepai search "user authentication flow"
grepai search "error handling middleware"
grepai search "database connection pool"
grepai search "API request validation"

# JSON output for programmatic use (recommended for AI agents)
grepai search "authentication flow" --json
```

### Query Tips

- **Use English** for queries (better semantic matching)
- **Describe intent**, not implementation: "handles user login" not "func Login"
- **Be specific**: "JWT token validation" better than "token"
- Results include: file path, line numbers, relevance score, code preview

### Workflow

1. Start with `grepai search` to find relevant code
2. Use `Read` tool to examine files from results
3. Only use Grep for exact string searches if needed


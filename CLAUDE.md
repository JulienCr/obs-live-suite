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
- When fixing a bug: use the `bugkiller` agent which handles the full TDD workflow (write failing test → fix bug → verify test passes).

## Development Commands

### Start Development (Most Common)
```bash
pnpm dev
```
Runs frontend (Next.js watch), backend (tsx watch), and MCP server (tsx watch) concurrently. **IMPORTANT**: Never build without authorization - dev mode has watch enabled.

### Individual Services
```bash
pnpm dev:frontend    # Next.js dev server only
pnpm dev:backend     # Backend server only
pnpm backend         # Backend without watch
pnpm dev:mcp         # MCP server (tsx watch)
pnpm studio-return:dev   # Studio Return Tauri app (dev)
pnpm studio-return:build # Studio Return Tauri app (production)
```

### Testing
```bash
pnpm test                    # Unit tests (Jest)
pnpm test:watch             # Unit tests in watch mode
pnpm test:coverage          # Coverage report
pnpm test:functional        # Functional tests for lower third
pnpm test:functional:ui     # Dashboard UI tests
pnpm test:all              # All tests
pnpm test:mcp              # MCP server tests (67 tests)
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
- **MCP Server** (port 3004): Model Context Protocol for AI-driven control

The backend runs independently to ensure WebSocket and OBS connections persist even during Next.js hot-reloading.

### Key Patterns

**Singleton Services**: Most services use getInstance() pattern:
- `DatabaseService` - SQLite connection
- `WebSocketHub` - WebSocket server
- `ChannelManager` - Pub/sub for overlays
- `OBSConnectionManager` - OBS WebSocket connection
- `QuizManager` - Quiz state machine
- `AppConfig`, `PathManager` - Configuration

**Event-Driven**: Overlays use pub/sub via ChannelManager:
```
Dashboard → API Route → ChannelManager.publish() → WebSocket → Overlay
```

### Service Layers

**lib/services/** — core business logic. Singletons use `getInstance()`.
- Database: `DatabaseService`, `DatabaseConnector`, `MigrationRunner`, `BackupService`
- Real-time: `WebSocketHub`, `ChannelManager`
- Overlays/media: `ThemeService`, `StorageService`, `SubVideoService`, `MediaPlayerManager`, `DSKService`, `YouTubeMetadataService`
- Settings/workspace: `SettingsService`, `SettingsStore`, `WorkspaceService`
- Macros/rate-limit: `MacroEngine`, `RateLimiterService`
- Quiz (`Quiz*`): `QuizManager` orchestrates; `QuizStore`, `QuizPhaseManager`, `QuizNavigationManager`, `QuizTimer`, `QuizScoringService`, `QuizBuzzerService`, `QuizViewerInputService`, `QuizZoomController`, `QuizMysteryImageController`, `QuizExamples`
- Games/shows: `WordHarvestManager`
- Integrations: `TwitchService`, `OllamaSummarizerService`, `WikipediaCacheService`, `WikipediaResolverService`
- Boot helper: `ServiceEnsurer` (lazy init of cross-service deps)
- Sub-folders:
  - `ai/` — `AiProviderFactory`, `AiToolBridge`, `systemPrompt` (French)
  - `llm/` — Anthropic/OpenAI/Ollama providers + `PromptTemplates`
  - `twitch/` — `TwitchAPIClient`, `TwitchOAuthManager`
  - `updater/` — `PluginScanner`, `GitHubReleaseChecker`, `VersionExtractor`, `RegistryService`, `PathResolver`

**lib/adapters/** — external I/O:
- `obs/` — `OBSConnectionManager` (auto-reconnect), `OBSStateManager`, `OBSSceneController`, `OBSSourceController`, `OBSEventHandler`, `OBSConnectionEnsurer`
- `streamerbot/` — `StreamerbotGateway` WebSocket client

**lib/models/** — Zod schemas per domain. Highlights: `Database`, `Theme`, `Macro`, `Quiz`/`QuizEvents`, `OverlayEvents`, `PresenterChannel`, `Cue`, `Guest`, `Poster`, `Profile`, `Sommaire`, `TitleReveal`, `WordHarvest`, `StudioReturn`, `Twitch`/`TwitchAuth`, `Widget`, `PanelColor`, `Plugin`, `MediaPlayer`, `TextPreset`, `Wikipedia`, `LLM`, `StreamerbotChat`/`ChatMessages`, `EventLog`, `DataSyncEvents`. Sub-folder `streamerbot/` for chat-related schemas.

**lib/utils/** — `Logger`, `BackendClient`, `themeEnrichment`, etc.

**lib/config/** — `AppConfig`, `PathManager`, `urls.ts`, `Constants.ts`.

**lib/init/** — `ServerInit.ts` (boot order: paths → logger → DB → migrations → services).

### Server Routes

**server/api/** — Backend Express routes: `overlays`, `obs` (+ `obs-helpers`), `quiz` (+ `quiz-bot`), `cue`, `presenter-settings`, `streamerbot-chat`, `chat-messages`, `media-player`, `twitch`, `word-harvest`.

**app/api/** - Next.js API routes:
- `/api/overlays/*` - Overlay control (lower, countdown, poster, quiz, chat-highlight, title-reveal, sommaire, etc.)
- `/api/obs/*` - OBS status, reconnect, record, stream
- `/api/actions/*` - Stream Deck actions (lower, countdown, poster, macro, panic)
- `/api/assets/*` - Guest, poster, theme, tag management
- `/api/profiles/*` - Profile CRUD and activation
- `/api/themes/*` - Theme CRUD
- `/api/settings/*` - Settings (general, obs, paths, integrations, studio-return, title-reveal defaults, etc.)
- `/api/presenter/*` - Presenter channels and cue management
- `/api/quiz/*` - Quiz questions and state
- `/api/word-harvest/*` - Word Harvest game state
- `/api/twitch/*` - Twitch OAuth and Helix calls
- `/api/youtube/*` - YouTube metadata
- `/api/wikipedia/*` - Wikipedia search/resolve/summarize
- `/api/llm/*`, `/api/ollama/*` - LLM model listing and summarization
- `/api/ai/chat` - AI chat assistant (streaming, tool-calling via MCP)
- `/api/media-player/*` - Media player control
- `/api/panel-colors/*` - Dashboard panel color prefs
- `/api/workspaces/*` - Workspace CRUD
- `/api/chat-messages/*` - Chat message storage
- `/api/updater/*` - Plugin scanning and updates
- `/api/init`, `/api/debug`, `/api/utils/*`, `/api/test/*` - boot / debug / utility endpoints

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
- Now Playing: `http://localhost:3000/overlays/now-playing`
- Composite: `http://localhost:3000/overlays/composite`
- Title Reveal: `http://localhost:3000/overlays/title-reveal`
- Word Harvest: `http://localhost:3000/overlays/word-harvest`
- Sommaire: `http://localhost:3000/overlays/sommaire`
- Studio Return (web): `http://localhost:3000/overlays/studio-return`

Each overlay connects to WebSocket hub and subscribes to its channel.

## Quiz System
- Host panel: `/quiz/host`
- Question editor: `/quiz/manage`
- 5 question types: qcm, image, closest, open, image_zoombuzz
- Chat commands: !a, !b, !c, !d, !n [number], !rep [text]
- Streamer.bot webhook: `POST /api/quiz-bot/chat`

## Title Reveal Overlay
- URL: `/overlays/title-reveal`
- GSAP-based onion-skin animation revealing stacked title lines
- Optional sound trigger; MIDI CC control for line transitions
- Editor: `components/title-reveal/TitleRevealEditor` with live preview
- Defaults configured in Settings > Title Reveal (`TitleRevealDefaultsSettings`)

## Word Harvest Overlay
- URL: `/overlays/word-harvest`
- Game-like word collection animations (sparkles, confetti, title, finale)
- Manual phase control from dashboard; MIDI bindings for phase transitions
- State: `WordHarvestManager` singleton
- Routes: `/api/word-harvest/*`, backend `server/api/word-harvest.ts`
- MIDI bindings in Settings > Word Harvest (`WordHarvestMidiSettings`)

## Twitch Integration
- OAuth + Helix API via `lib/services/twitch/` (`TwitchAPIClient`, `TwitchOAuthManager`)
- High-level service: `lib/services/TwitchService`
- Settings UI: Settings > Twitch (`TwitchSettings`)
- Routes: `/api/twitch/*`, backend `server/api/twitch.ts`
- Category picker: `components/twitch/TwitchCategoryPicker`

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

## MCP Server
Workspace package `obs-live-suite-mcp` on port **3004** (stdio + Streamable HTTP). 35 tools across 10 domains, proxied to frontend/backend via `httpClient.ts`.

**See `mcp-server/CLAUDE.md`** for transports, layout, test setup, and gotchas (IPv6, TLS with mkcert, stateless mode).

Run: `pnpm dev:mcp` / `pnpm test:mcp`.

## AI Chat Assistant
- Conversational AI integrated in the dashboard top bar (Bot icon)
- Sheet-based side panel (400px right) using Vercel AI SDK v6
- Providers: Ollama, OpenAI, Anthropic (configured in Settings > AI)
- Tool calling via MCP server (26 tools auto-discovered)
- Destructive tools (delete-guest, delete-poster, clear-all) require client-side confirmation
- Graceful degradation: works in text-only mode if MCP server is down
- Key files: `lib/services/ai/`, `components/ai-chat/`, `app/api/ai/chat/route.ts`
- Store: `lib/stores/aiChatStore.ts` (zustand)

### Known Issues / Debugging
- **IPv6 resolution**: Node 22 resolves `localhost` to `::1` (IPv6), but servers listen on IPv4 only. MCP server config uses `127.0.0.1` explicitly to avoid `ECONNREFUSED`.
- **MCP stateless mode**: Each tool call creates a new MCP Client + Transport (server has no session persistence between requests).
- **TLS with mkcert**: `NODE_TLS_REJECT_UNAUTHORIZED=0` is set in `mcp-server/src/index.ts` for dev. Required when HTTPS certificates are detected.

## Stream Deck Plugin
Elgato plugin that calls the app's HTTP API. Source in `streamdeck-plugin/obslive-suite/src/`; bundle in `com.julien-cruau.obslive-suite.sdPlugin/`.

**See `streamdeck-plugin/obslive-suite/CLAUDE.md`** for action registration patterns and integration model.

List action IDs: `pnpm streamdeck:ids`.

## Studio Return (Tauri App)
Transparent always-on-top overlay for the studio-return HDMI monitor. Rust (Tauri) + vanilla JS, not Next.js.

**See `studio-return/CLAUDE.md`** for architecture, WebSocket fallback chain, `config.json` priority, settings UI, and macOS transparency gotchas.

Run: `pnpm studio-return:dev` (add `-- -- --debug` for the debug overlay) / `pnpm studio-return:build`.

## PM2 Deployment
`ecosystem.config.cjs` defines three apps:
- `obs-backend`: Express + WebSocket (port 3002/3003)
- `obs-frontend`: Next.js server (port 3000)
- `obs-mcp`: MCP server (port 3004)

All use fork mode with autorestart and memory limits.

## Important Notes
- **Never build** without explicit user authorization (per CLAUDE.md user instructions)
- Use `pnpm` (not npm/yarn)
- Node.js 20+ required
- Database auto-initializes on first run via `ServerInit.ts`
- Logger configured via `Logger.setLogFilePath()` before use
- Follow `.cursor/rules/documentation.mdc` guidelines (prefer executable clarity over prose)

## Component Organization

One-liner per directory — `ls components/<dir>` for current file inventory.

- **ui/** — shadcn/ui base components
- **shell/** — App shell: `AppShell`, `DashboardShell` (Dockview), `AppSidebar`, `ContentTopBar`, `CommandPalette`, workspace selector/manager, panel utilities
- **dashboard/** — Top-level widgets: `EventLog`, `MacrosBar`, `HeaderOverflowMenu`, `OverlayControlPanel` + `cards/` and `widgets/`
- **panels/** — Dockview panel implementations shared across modes
- **presenter/** — Presenter UI: `PresenterShell` (Dockview), `CueCard`, cue-feed/VDO/chat panels
- **overlays/** — Overlay renderers (one per broadcast overlay — see "Overlays" section)
- **quiz/** — Host control (`host/`), question editor (`manage/`), overlay display components
- **assets/** — `GuestManager`, `PosterManager`, `ThemeManager`, image uploaders/croppers
- **settings/** — One component per settings panel (OBS, paths, plugins, studio-return, Twitch, Streamer.bot, chat, Ollama, title-reveal defaults, word-harvest MIDI, presenter channels, etc.)
- **theme-editor/** — `ThemeEditor` with 16:9 canvas + `ThemeList`, `ThemeCard`
- **title-reveal/** — Editor, preview, per-line editor for Title Reveal overlay
- **twitch/** — `TwitchCategoryPicker`
- **updater/** — `UpdaterContainer` (plugin version-check UI)
- **ai-chat/** — `AiChatSheet`, `AiChatMessages`, `AiChatInput`, `AiChatButton`
- **shared/** — Reusable pickers/inputs (`FontFamilyCombobox`, `VirtualizedGrid`, etc.)
- **profiles/** — `ProfileManager`
- **providers/** — App-wide context providers


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


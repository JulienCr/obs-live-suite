## Implementation Plan

### Phase 1: Project Foundation & Structure

**1.1 Initialize Project**
- Create Next.js 14+ project with TypeScript, App Router
- Set up pnpm with package.json
- Configure Tailwind CSS + shadcn/ui
- Create `.env.example`, `.gitignore` (include `.env`, `node_modules`, `dist`, `.obs-live-suite/`)
- Initialize TASKS.md and MEMORY.md in project root
- Create comprehensive folder structure:
  ```
  app/
    api/                    # API routes (actions, websocket upgrade)
    dashboard/              # Main dashboard page
    overlays/               # Overlay renderer pages
    assets/                 # Assets library page
    profiles/               # Profile management page
    settings/               # Settings page
  lib/
    adapters/               # External service adapters
    managers/               # Business logic managers
    models/                 # Data models & types
    services/               # Core services
    utils/                  # Utility functions
    validators/             # Zod schemas
  components/
    ui/                     # shadcn/ui components
    dashboard/              # Dashboard-specific components
    overlays/               # Overlay-specific components
    common/                 # Shared components
  public/
    assets/                 # Static assets
  docs/                     # Documentation
  ```

**1.2 Core Configuration**
- Create `lib/config/AppConfig.ts` class for app-wide settings
- Create `lib/config/PathManager.ts` for managing `~/.obs-live-suite/` paths
- Create `lib/utils/Logger.ts` utility class for structured logging
- Set up environment variable schema with Zod validation

### Phase 2: Data Layer & Models

**2.1 Data Models** (each in separate file under `lib/models/`)
- `Guest.ts` - Guest entity with validation
- `Poster.ts` - Poster entity with file reference
- `Preset.ts` - Preset base + specific types
- `Profile.ts` - Show profile with all settings
- `Plugin.ts` - Plugin/script metadata
- `Theme.ts` - Theme definitions and colorways
- `Macro.ts` - Macro sequence definitions

**2.2 Data Persistence**
- Create `lib/services/DatabaseService.ts` - wrapper for lowdb or better-sqlite3
- Create `lib/services/StorageService.ts` - file system operations for assets
- Create `lib/services/BackupService.ts` - export/import profiles as zip
- Implement migrations system for schema updates

### Phase 3: OBS Integration

**3.1 OBS Adapter** (under `lib/adapters/obs/`)
- `OBSConnectionManager.ts` - connection lifecycle, auth, reconnection
- `OBSStateManager.ts` - current scene, streaming/recording status
- `OBSSceneController.ts` - scene item visibility, DSK toggle
- `OBSSourceController.ts` - text/browser source updates
- `OBSEventHandler.ts` - event subscription and routing
- All files use obs-websocket-js library

**3.2 DSK Layer Management**
- Create `lib/services/DSKService.ts` - manages global "Habillage" scene item
- Auto-detection and creation of DSK layer if missing
- Scene-agnostic overlay control

### Phase 4: Real-Time Communication

**4.1 WebSocket Hub**
- Create `lib/services/WebSocketHub.ts` - WebSocket server manager
- Create `lib/services/ChannelManager.ts` - pub/sub for overlay channels
- Define event types in `lib/models/OverlayEvents.ts`
- Implement acknowledgment system for state sync

**4.2 Overlay Communication Protocol**
- Define channels: `lower`, `countdown`, `poster`, `system`
- Event schemas with Zod validation
- State synchronization between dashboard and overlays

### Phase 5: Overlay Renderers

**5.1 Lower Third Overlay** (`app/overlays/lower-third/`)
- `page.tsx` - Lower third renderer with WebSocket subscription
- `LowerThirdRenderer.tsx` - component with animation logic
- `styles.module.scss` - CSS animations (slide, fade)
- Support templates: Classic, Bar, Card, Slide
- Position switching (left/right)
- Auto-hide timer

**5.2 Countdown Overlay** (`app/overlays/countdown/`)
- `page.tsx` - Countdown renderer
- `CountdownRenderer.tsx` - timer logic with pause/resume
- Support styles: Bold, Corner, Banner
- Sound cue integration at T-10s
- Presets integration

**5.3 Poster Overlay** (`app/overlays/poster/`)
- `page.tsx` - Poster renderer
- `PosterRenderer.tsx` - image/video display with transitions
- Support transitions: Fade, Slide, Cut, Blur backdrop
- Carousel/rotation support
- Scheduled takeover

### Phase 6: Dashboard UI

**6.1 Main Dashboard** (`app/dashboard/`)
- `page.tsx` - Main dashboard layout
- `DashboardHeader.tsx` - OBS status bar, clock, recording/streaming toggles
- `OverlayControlPanel.tsx` - Container for overlay cards
- `MacrosBar.tsx` - Configurable macro buttons
- `EventLog.tsx` - Last 50 actions with audit trail

**6.2 Overlay Control Cards** (`components/dashboard/`)
- `LowerThirdCard.tsx` - Title/subtitle inputs, guest selector, show/hide/auto buttons
- `CountdownCard.tsx` - Preset buttons, time input, start/pause/reset, style dropdown
- `PosterCard.tsx` - Preview, carousel, takeover button, schedule controls
- Each card max 150 lines, extract sub-components as needed

**6.3 Dashboard State Management**
- Create `lib/managers/DashboardStateManager.ts` - centralized state
- Real-time updates from OBS and overlays
- Optimistic UI updates

### Phase 7: Assets Library

**7.1 Poster Management** (`app/assets/posters/`)
- `page.tsx` - Posters grid view
- `PosterGrid.tsx` - Drag-and-drop reordering
- `PosterUpload.tsx` - Bulk import with metadata
- `PosterCard.tsx` - Preview with edit/delete actions

**7.2 Guest Management** (`app/assets/guests/`)
- `page.tsx` - Guests list
- `GuestList.tsx` - Table/card view
- `GuestForm.tsx` - Create/edit form (name, subtitle, color, avatar)
- `GuestManager.ts` - Business logic for guest operations

**7.3 Themes & Branding** (`app/assets/themes/`)
- `page.tsx` - Theme editor
- `ThemeEditor.tsx` - Color picker, font selector
- `ThemePreview.tsx` - Live preview of overlays
- Global + per-profile theme support

### Phase 8: Profiles & Show Management

**8.1 Profile System** (`app/profiles/`)
- `page.tsx` - Profile list and switcher
- `ProfileEditor.tsx` - Full profile configuration
- `ProfileExport.tsx` - Export as zip with assets
- `ProfileImport.tsx` - Import and merge profiles

**8.2 Profile Manager**
- Create `lib/managers/ProfileManager.ts` - CRUD operations
- Profile activation with overlay reset
- Asset bundling and validation
- Version compatibility checking

### Phase 9: Stream Deck Integration

**9.1 HTTP API Endpoints** (`app/api/actions/`)
- `lower/route.ts` - show, hide, showPreset endpoints
- `countdown/route.ts` - start, pause, reset with params
- `poster/route.ts` - takeover, next, previous
- `macro/route.ts` - execute macro by ID
- CSRF protection and rate limiting

**9.2 Feedback System**
- `app/api/status/route.ts` - Status polling endpoint for Stream Deck
- WebSocket client option for live icon updates
- State serialization for Stream Deck display

**9.3 Stream Deck Profile Generator**
- Create `lib/services/StreamDeckProfileGenerator.ts`
- Export `.streamDeckProfile` file with pre-configured buttons
- Documentation for import process

### Phase 10: OBS Extensions Updater

**10.1 Local Scanner** (`lib/services/updater/`)
- `PluginScanner.ts` - Filesystem traversal for plugins/scripts
- `VersionExtractor.ts` - Parse version from metadata/headers
- `PathResolver.ts` - Platform-specific OBS paths (Windows/macOS/Linux)
- Plugin normalization and identification

**10.2 Registry System**
- Create `public/registry.json` - Plugin registry with GitHub repos
- `RegistryService.ts` - Load and update registry
- `GitHubReleaseChecker.ts` - Fetch latest releases (rate-limited, cached)
- Version comparison with semver

**10.3 Updater UI** (`app/updater/`)
- `page.tsx` - Updater dashboard
- `PluginList.tsx` - Installed plugins with versions
- `UpdateChecker.tsx` - Compare and show updates
- `ReleaseNotes.tsx` - Display changelog excerpts
- Compatibility warnings (OBS version matrix)
- Actions: Open download page, mark ignored, add to watchlist

### Phase 11: Macro System

**11.1 Macro Engine**
- Create `lib/services/MacroEngine.ts` - Execute action sequences
- `lib/models/MacroAction.ts` - Action types and parameters
- Support delay, conditional, loop in sequences
- Macro validation before execution

**11.2 Macro Editor** (`components/macros/`)
- `MacroEditor.tsx` - Visual sequence builder
- `ActionSelector.tsx` - Dropdown for action types
- `MacroPreview.tsx` - Test execution
- Drag-and-drop reordering

### Phase 12: Settings & Configuration

**12.1 Settings UI** (`app/settings/`)
- `page.tsx` - Settings layout with tabs
- `OBSSettings.tsx` - WebSocket URL/password, connection test
- `DSKSettings.tsx` - Layer source names, fallback behavior
- `StreamDeckSettings.tsx` - Endpoints base URL
- `PathSettings.tsx` - Plugin scan paths override
- `BackupSettings.tsx` - Export/import app config

**12.2 Configuration Management**
- `lib/managers/SettingsManager.ts` - Persist and validate settings
- Connection testing utilities
- Auto-detection for OBS paths

### Phase 13: Advanced Features

**13.1 Scheduled Rotations**
- Create `lib/services/SchedulerService.ts` - Cron-like scheduling
- Poster rotation automation
- Macro scheduling support

**13.2 Audio Cues**
- Create `lib/services/AudioCueService.ts` - Sound playback
- T-10s countdown beep
- Action confirmation sounds
- Per-profile audio settings

**13.3 Health & Diagnostics**
- `lib/services/HealthMonitor.ts` - System health checks
- Connection status tracking
- Error aggregation and reporting
- Health panel UI component

### Phase 14: Security & Reliability

**14.1 Security Layer**
- CSRF tokens for all POST endpoints
- Rate limiting middleware (`lib/middleware/RateLimiter.ts`)
- Optional LAN mode with auth token
- Input validation with Zod on all endpoints

**14.2 Reliability Features**
- Action queue with replay on reconnect
- Graceful degradation when OBS disconnects
- Auto-reconnection with exponential backoff
- Transaction rollback for failed operations

### Phase 15: Deployment & DevOps

**15.1 PM2 Configuration**
- Create `ecosystem.config.js` for pm2
- Scripts: `pnpm start:prod`, `pnpm stop`, `pnpm restart`
- Auto-restart on crash
- Log rotation

**15.2 Build & Optimization**
- Production build configuration
- Asset optimization
- Bundle size monitoring
- Performance profiling

**15.3 Documentation**
- `README.md` - Setup and usage guide
- `docs/API.md` - HTTP API documentation
- `docs/ARCHITECTURE.md` - System architecture with Mermaid diagrams
- `docs/STREAM-DECK-SETUP.md` - Stream Deck integration guide
- `docs/PLUGIN-REGISTRY.md` - Adding plugins to registry
- JSDoc comments throughout codebase

### Phase 16: Testing & Polish

**16.1 Integration Testing**
- Test OBS connection scenarios
- Test overlay synchronization
- Test profile export/import
- Test macro execution

**16.2 UI Polish**
- Responsive design verification
- Dark/light theme switching
- Loading states and skeletons
- Error boundaries and fallbacks
- Accessibility (ARIA labels, keyboard navigation)

**16.3 Performance Optimization**
- WebSocket message batching
- Overlay rendering optimization
- Database query optimization
- Memory leak prevention

---

## File Count Estimate
- ~120-150 files total
- Average 80-120 lines per file
- All files under 500 lines (target 100-150)

## Key Technologies
- Next.js 14+ (App Router)
- TypeScript
- Tailwind CSS + shadcn/ui
- Socket.IO or ws for WebSocket
- obs-websocket-js v5
- lowdb or better-sqlite3
- react-hook-form + Zod
- archiver (for zip export)
- pm2 (deployment)

## Architecture Principles Applied
✓ Single Responsibility - each file does one thing
✓ Modular Design - Lego-like reusable components
✓ Manager Pattern - clear separation of concerns
✓ Files under 500 lines (target 100-150)
✓ OOP with composition
✓ JSDoc documentation
✓ TASKS.md and MEMORY.md tracking

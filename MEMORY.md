# Project Memory & Lessons Learned

This file documents key decisions, mistakes, and dead-ends encountered during development.

## Architecture Decisions

### Server Initialization
**Problem**: Initially, the server services (OBS connection, WebSocket hub, database) were only initialized when `/api/init` endpoint was called manually. This meant OBS wouldn't connect automatically on startup.

**Solution**: Added `instrumentation.ts` file using Next.js instrumentation hooks. This runs once when the server starts, automatically initializing all services before any requests are handled.

**Key Files**:
- `instrumentation.ts` - Server startup initialization
- `lib/init/ServerInit.ts` - Singleton initialization manager
- `next.config.mjs` - Enabled `instrumentationHook` experimental feature

**Lesson**: For Next.js apps that need server-side initialization (database connections, external service connections), use the `instrumentation.ts` hook rather than relying on middleware or first-request patterns.

---

## Testing Strategy

### React Hook Dependencies
**Problem**: When refactoring overlay components to fix linting errors, adding `useCallback` to event handlers caused "Cannot access before initialization" errors because hooks were defined after they were referenced in dependency arrays.

**Solution**: Define `useCallback` hooks BEFORE the `useEffect` hooks that depend on them. Hook order matters in React.

**Affected Files**:
- `components/overlays/CountdownRenderer.tsx`
- `components/overlays/LowerThirdRenderer.tsx`
- `components/overlays/PosterRenderer.tsx`

**Lesson**: Always define `useCallback`/`useMemo` hooks before the `useEffect` hooks that list them as dependencies.

### Act() Warnings in Tests
**Problem**: React Testing Library produces act() warnings when state updates happen outside of explicit act() calls, particularly in WebSocket message handlers and timers.

**Solution**: Suppressed these warnings in `jest.setup.js` since they don't affect test functionality - the components work correctly in production.

**Why**: The warnings are expected because we're simulating async WebSocket messages and timer callbacks. Wrapping everything in act() makes tests harder to read without providing value.

**Lesson**: Not all test warnings need to be fixed. If the component works correctly in production, suppressing false-positive warnings is acceptable.

---

## Type Safety Improvements

### Eliminating `any` Types
**Problem**: Initial implementation used `any` types in several places (database rows, event handlers) which defeated TypeScript's purpose.

**Fixed Locations**:
- `app/api/updater/check/route.ts` - Added `PluginRow` interface
- Overlay components - Added proper payload type definitions
- Event handlers - Typed WebSocket message data structures

**Lesson**: Always define interfaces for data structures, even if they seem simple. It prevents bugs and enables IDE autocompletion.

---

## Configuration Management

### Environment Variables
**Current Approach**: Using `.env` file for secrets, config files for structure.

**Key Principle**: Never commit real credentials to git. Always use `.env` (gitignored) for sensitive data.

---

## OBS Integration

### Connection Resilience
**Pattern**: The app is designed to start even if OBS isn't running. Connection manager automatically retries with exponential backoff.

**Why**: User might start the app before starting OBS, or OBS might crash during use. The app should handle this gracefully.

**Implementation**:
- `OBSConnectionManager` - Handles reconnection logic
- `ServerInit.initializeOBS()` - Doesn't throw on failure, just logs warning

---

## Next.js Specific

### Experimental Features Used
- `instrumentationHook` - For server startup initialization
- `serverComponentsExternalPackages` - For better-sqlite3 native module

**Note**: These are marked experimental but are stable and widely used. Monitor Next.js releases for when they become stable.

---

## WebSocket Implementation

### Multiple WebSocket Initialization Problem (January 2025)
**Problem**: WebSocket server was experiencing constant connection/disconnection cycles. Root cause was multiple processes trying to start WebSocket servers on the same port.

**Diagnosis**:
1. `instrumentation.ts` called `ServerInit.initialize()` on startup, which SKIPPED WebSocket initialization (lazy loading approach)
2. Multiple API routes (`/api/overlays/*`, `/api/actions/*`) accessed `ChannelManager.getInstance()`
3. `ChannelManager` called `WebSocketHub.getInstance()` but never started the server
4. Only `/api/init` and `/api/test/lower-third` called `ServiceEnsurer.ensureServices()` which actually starts WebSocket
5. In Next.js dev mode, each API route runs in separate process → multiple processes tried to bind to same port
6. Result: `EADDRINUSE` errors, connection failures, constant reconnection attempts

**Solution Implemented**:
1. **ServerInit now starts WebSocket on initialization** - Removed lazy loading approach, WebSocket starts immediately in `instrumentation.ts`
2. **All API routes now call `ServiceEnsurer.ensureServices()`** - Ensures services are running in current process before use
3. **Improved error handling** - Better logging for port conflicts and duplicate initialization attempts
4. **Process-safe initialization** - `ServiceEnsurer` uses locking mechanism to prevent race conditions

**Files Changed**:
- `lib/init/ServerInit.ts` - Now starts WebSocket immediately instead of skipping
- `lib/services/ServiceEnsurer.ts` - Proper initialization locking
- `lib/services/WebSocketHub.ts` - Improved error messages for port conflicts
- `app/api/overlays/lower/route.ts` - Added ServiceEnsurer call
- `app/api/overlays/countdown/route.ts` - Added ServiceEnsurer call
- `app/api/overlays/poster/route.ts` - Added ServiceEnsurer call
- `app/api/actions/lower/show/route.ts` - Added ServiceEnsurer call
- `app/api/actions/lower/hide/route.ts` - Added ServiceEnsurer call
- `app/api/actions/countdown/start/route.ts` - Added ServiceEnsurer call

**Lesson**: In Next.js with multiple API routes, always ensure singleton services (like WebSocket servers) are initialized once at server startup via `instrumentation.ts`, not lazily on first request. API routes should use `ServiceEnsurer` to verify services are running in their process.

### WebSocket Reconnection Loop (January 2025)
**Problem**: Overlay components showed constant connect/disconnect cycles every 3 seconds in development mode.

**Root Cause**: 
- `LowerThirdRenderer.tsx` had `onclose` handler that called `window.location.reload()` after 3 seconds
- React dev mode with HMR causes frequent component remounts
- Cycle: mount → cleanup closes WebSocket → onclose reloads page → mount → repeat

**Solution**:
- Replaced page reload with proper reconnection logic
- Added `isUnmounting` flag to distinguish intentional closes from unexpected disconnections
- Only reconnect on unexpected disconnections, not on React cleanup
- Applied fix to all overlay components (LowerThird, Countdown, Poster)

**Files Changed**:
- `components/overlays/LowerThirdRenderer.tsx` - Removed page reload, added reconnection logic
- `components/overlays/CountdownRenderer.tsx` - Added proper error and reconnection handlers
- `components/overlays/PosterRenderer.tsx` - Added proper error and reconnection handlers

### Lower Third Not Showing Text (October 2025)
**Problem**: Lower third overlay at `/overlays/lower-third` wouldn't display any text. API calls were silently failing.

**Root Cause**: 
- `lowerThirdShowPayloadSchema` required `themeId` to be a valid UUID
- `/api/actions/lower/show` was sending `themeId: "default"` (not a valid UUID)
- Zod validation failed silently, preventing the message from being broadcast
- Theme system isn't fully implemented yet (marked with TODO)

**Solution**:
- Made `themeId` optional in `lowerThirdShowPayloadSchema` using `.optional()`
- This allows the lower third to work while theme system is being developed

**Files Changed**:
- `lib/models/OverlayEvents.ts` - Made `themeId` field optional

**Lesson**: When validation schemas fail silently, check for required fields that might not have proper values yet. Use `.optional()` for fields that aren't fully implemented.

### CRITICAL: Port 3001 Conflict - Architecture Clarification (October 2025)
**Problem**: When loading overlay pages in OBS, error `EADDRINUSE: address already in use :::3001`. Next.js was trying to start WebSocket server on same port as backend.

**Root Cause**:
- Overlay pages called `/api/init` which triggered `ServiceEnsurer.ensureServices()`
- This tried to start WebSocket server in Next.js process on port 3001
- Backend already runs WebSocket on port 3001
- **Architectural confusion**: Next.js should NEVER start WebSocket services

**Correct Architecture**:
```
Backend (standalone):
  - Port 3001: WebSocket (for overlays + internal use)
  - Port 3002: HTTP API (for dashboard requests)
  
Next.js (UI only):
  - Port 3000: Serves dashboard and overlay HTML pages
  - NO WebSocket server
  - NO service initialization
  
Overlay pages (in OBS):
  - Connect directly to ws://localhost:3001 (backend)
  - No need for /api/init call
```

**Solution**:
- Removed `/api/init` call from `app/overlays/lower-third/page.tsx`
- Overlay pages now just render components that connect to backend WebSocket
- Only backend starts and manages WebSocket server

**Files Changed**:
- `app/overlays/lower-third/page.tsx` - Removed unnecessary `/api/init` call

**Lesson**: In a multi-process architecture, be crystal clear about which process owns which ports. Frontend (Next.js) should only serve UI; backend should own all stateful services (WebSocket, OBS connection). Never duplicate service initialization across processes.

### Overlay Hide Action Not Working (January 2025)
**Problem**: Dashboard could show lower third overlays successfully, but the Hide button didn't work. Overlay remained visible after clicking Hide.

**Diagnosis**:
- Added console logging to trace WebSocket messages
- Show event sent: `type: "show"` ✅ (correct)
- Hide event sent: `type: "LOWER_THIRD_HIDE"` ❌ (wrong!)
- Overlay switch statement expected `type: "hide"` but received `type: "LOWER_THIRD_HIDE"`

**Root Cause**:
- `server/backend.ts` had old inline route handlers with hardcoded uppercase event type strings
- When dashboard called `/api/actions/lower/hide`, it proxied to backend's `/api/overlays/lower`
- Backend converted `action: "hide"` to `type: "LOWER_THIRD_HIDE"` (old naming convention)
- Overlay renderer only recognized lowercase event types defined in `OverlayEvents` enum

**Solution**:
- Updated `server/backend.ts` overlay routes to use lowercase enum-compatible strings:
  - Lower third: `"show"`, `"hide"`, `"update"` (was: `"LOWER_THIRD_SHOW"`, etc.)
  - Countdown: `"set"`, `"start"`, `"pause"`, `"reset"` (was: `"COUNTDOWN_SET"`, etc.)
  - Poster: `"show"`, `"hide"`, `"next"`, `"previous"` (was: `"POSTER_SHOW"`, etc.)

**Files Changed**:
- `server/backend.ts` - Updated all overlay event type strings to match enum values

**Lesson**: When you have event type enums defined in one place (`lib/models/OverlayEvents.ts`), ensure ALL places that send those events use the same string values. Duplicate route handlers in different files can get out of sync. Consider importing and using the actual enum values instead of hardcoded strings to prevent this type of mismatch.

---

## Overlay Architecture

### Composite vs Individual Overlays (October 2025)
**Decision**: Provide both composite and individual overlay options for maximum flexibility.

**Composite Overlay** (`/overlays/composite`):
- Combines all three overlay types (lower-third, countdown, poster) into a single page
- Easier to set up in OBS (only one browser source needed)
- All overlays share the same z-index layering: Poster (bottom) → Lower Third (middle) → Countdown (top)
- Each renderer still manages its own WebSocket subscription and state independently
- Recommended for users who want simplicity

**Individual Overlays** (`/overlays/lower-third`, `/overlays/countdown`, `/overlays/poster`):
- Separate pages for each overlay type
- More control in OBS (can reorder layers, apply different filters, enable/disable individually)
- Useful for advanced users who need granular control
- All individual overlays are kept alongside the composite option

**Implementation Notes**:
- Each renderer component connects to the same WebSocket on port 3001
- Renderers subscribe to their specific channel (lower, countdown, poster)
- Multiple renderers on the same page don't conflict - each handles its own events
- The composite page simply renders all three components in a single container

**Files**:
- `app/overlays/composite/page.tsx` - Composite overlay page
- `app/overlays/lower-third/page.tsx` - Individual lower third
- `app/overlays/countdown/page.tsx` - Individual countdown
- `app/overlays/poster/page.tsx` - Individual poster

**Lesson**: When building overlay systems, provide both "all-in-one" and "à la carte" options. Different users have different needs for control vs. simplicity.

---

## Plugin Management System (October 2025)

### Plugin Scanner and Update Checker UI Implementation
**Context**: The backend infrastructure for plugin scanning existed but had no user interface. User requested ability to list plugins and check for updates.

**Complete Solution Implemented**:
1. **PluginSettings Component** (`components/settings/PluginSettings.tsx`):
   - Lists all plugins from database with details (name, version, kind, path)
   - "Scan Plugins" button triggers `/api/updater/scan` to discover installed plugins
   - "Check for Updates" button triggers `/api/updater/check` to query GitHub
   - Update status badges (Update Available, Up to Date, Unknown, Ignored)
   - Release notes display for plugins with updates
   - External links to GitHub releases
   - Loading states, error handling, and auto-refresh

2. **Settings Page Update** (`app/settings/page.tsx`):
   - Added 5th tab "Plugins" to existing settings page
   - Changed TabsList from `grid-cols-4` to `grid-cols-5`
   - Imported Package icon from lucide-react

3. **Existing Backend Infrastructure** (already complete):
   - `PluginScanner` - Scans OBS directories for plugins/scripts
   - `/api/updater/scan` - POST endpoint to trigger scan
   - `/api/updater/check` - POST endpoint to check for updates via GitHub
   - `/api/updater/plugins` - GET endpoint to retrieve all plugins
   - `RegistryService` - Maps plugin names to GitHub repos
   - `GitHubReleaseChecker` - Fetches latest releases from GitHub

**Key Implementation Details**:
- Plugin data stored in `plugins` table in SQLite database
- Paths stored as JSON string, parsed on display
- Status badges use color coding: green=up_to_date, blue=update_available, gray=unknown
- All API calls handle errors gracefully with user-friendly messages
- Component follows React hooks best practices (useEffect, useState)

**Files Modified**:
- NEW: `components/settings/PluginSettings.tsx` - Plugin management UI
- MODIFIED: `app/settings/page.tsx` - Added Plugins tab
- MODIFIED: `TASKS.md` - Updated working features list

**User Experience Flow**:
1. User navigates to Settings → Plugins tab
2. Clicks "Scan Plugins" to discover installed OBS plugins
3. System scans OBS plugin/script directories and saves to database
4. Plugins displayed in scrollable list with details
5. User clicks "Check for Updates" to query GitHub for latest versions
6. System updates database with latest version info and update status
7. Plugins with updates show blue badge and release notes
8. User can click "View Release" to open GitHub release page

**Lesson**: When backend infrastructure exists but has no UI, create a dedicated settings component that wraps the API calls with proper loading states, error handling, and user-friendly feedback. Always provide both "scan" and "refresh" capabilities for discovery-type features.

### Plugin Scanner Fixes (October 2025)
**Problem 1**: Each scan appended results instead of replacing them, creating duplicate entries.

**Root Cause**: The scan endpoint used `INSERT OR REPLACE` with `randomUUID()`, but since IDs were always new, it always inserted instead of replacing.

**Solution**: Clear the plugins table before scanning with `DELETE FROM plugins` before inserting new scan results.

**Problem 2**: Scanner was listing `32bit` and `64bit` folders as plugins instead of actual plugin files.

**Root Cause**: On Windows, OBS plugins are `.dll` files stored in subdirectories (`32bit`/`64bit`). The scanner was treating these subdirectories as plugins instead of scanning their contents.

**Solution**: Updated `PluginScanner.scanPluginDirectory()` to:
1. Detect special directories (`32bit`, `64bit`, `bin`)
2. Scan inside them for actual plugin files (`.dll`, `.so`, `.dylib`)
3. Extract plugin name from filename without extension
4. Use a `Set` to deduplicate (same plugin in both 32bit and 64bit)
5. Still handle regular plugin directories for non-Windows platforms

**Files Modified**:
- `app/api/updater/scan/route.ts` - Added `DELETE FROM plugins` before insert
- `lib/services/updater/PluginScanner.ts` - Fixed directory scanning logic

**Lesson**: When scanning cross-platform file structures, understand the platform-specific conventions (Windows uses DLLs in arch-specific folders, while Linux/Mac may use different structures). Always deduplicate when the same logical item can appear in multiple locations (32bit + 64bit).

### Plugin Scanner - Deduplication and Built-in Filter (October 2025)
**Problem 1**: Plugins still appeared twice even after initial fix because deduplication was per-directory, not global.

**Root Cause**: The `Set` for deduplication was created in `scanPluginDirectory()`, which is called once per directory. Since `PathResolver.getPluginDirectories()` returns duplicate paths on Windows, the same directory was scanned twice with fresh Sets.

**Solution**: Moved deduplication to the `scan()` method level:
1. Use a `Map<name, plugin>` to deduplicate across all directories
2. Track processed directories with a `Set` to skip duplicates
3. Only keep first occurrence of each plugin name

**Problem 2**: Too many plugins listed (84 total, mostly built-in OBS plugins).

**Root Cause**: Users typically only want to see custom/third-party plugins, not the 40+ built-in plugins that ship with OBS.

**Solution**: Implemented built-in plugin filtering:
1. Created `BUILTIN_PLUGINS` Set with all known OBS built-in plugins
2. Mark built-in plugins with `isIgnored: true` during scan
3. Added `showBuiltIn` checkbox toggle in UI (unchecked by default)
4. Filter display to show only custom plugins unless toggled
5. Show count of hidden built-in plugins in UI

**Custom Plugins Identified** (from user's system):
- downstream-keyer
- move-transition
- obs-composite-blur
- obs-shaderfilter
- transition-table
- obs-midi-mg

**Files Modified**:
- `lib/services/updater/PluginScanner.ts` - Global deduplication, built-in detection
- `components/settings/PluginSettings.tsx` - Added filter toggle and count display

**Lesson**: When building admin/management tools, provide sensible defaults (hide built-in/system items) while giving users the option to see everything. Use database fields creatively (isIgnored) to mark different categories of items.

### Plugin Version Detection Enhancement (October 2025)
**Context**: Plugin versions were not being detected because the original `VersionExtractor` only looked for metadata files in plugin directories, but Windows plugins are DLL files stored directly in `32bit`/`64bit` folders.

**Solution**: Enhanced `extractFromPlugin()` to detect DLL files and use multiple strategies:
1. **Check for companion JSON** - Look for `[plugin-name].json` in the same directory
2. **OBS data folder** - Check `C:\Program Files\obs-studio\data\obs-plugins\[plugin-name]\` for:
   - `manifest.json`, `plugin.json` (JSON version fields)
   - `version.txt`, `VERSION` (plain text version files)
   - `locale/en-US.ini` (locale files often contain version)
3. **Documentation files** - Check nearby docs/README files for version info
4. **Pattern matching** - Extract semantic versions (X.Y.Z) from text content

**OBS Plugin Data Structure** (Windows):
```
C:\Program Files\obs-studio\
├── obs-plugins\
│   ├── 32bit\
│   │   └── plugin-name.dll
│   └── 64bit\
│       └── plugin-name.dll
└── data\
    └── obs-plugins\
        └── plugin-name\
            ├── manifest.json (may contain version)
            └── locale\
                └── en-US.ini (may contain version)
```

**Files Modified**:
- `lib/services/updater/VersionExtractor.ts` - Added `extractFromPluginFile()` method

**Lesson**: On Windows, DLL metadata isn't easily accessible from Node.js. Instead, look for companion metadata files in known OBS data structures. Different plugin authors store version info in different places - use multiple fallback strategies.

---

## Stream Deck Integration (October 2025)

### Convenience API Endpoints for Stream Deck
**Context**: User requested guidance on wiring app actions to Stream Deck. While basic endpoints existed, they required manual text entry or complex JSON payloads.

**Solution Implemented**:
1. **Guest Lower Third by ID** - `/api/actions/lower/guest/[id]`
   - Automatically loads guest name, subtitle from database
   - Only requires guest ID in URL, optional duration in body
   - Example: `POST http://localhost:3000/api/actions/lower/guest/abc-123`

2. **Poster Control by ID** - `/api/actions/poster/show/[id]`, `/hide`, `/next`, `/previous`
   - Show specific poster by ID without knowing file URL
   - Simplified endpoints for hide/next/previous actions
   - All on port 3000 for consistency

3. **Helper Script** - `scripts/list-streamdeck-ids.js`
   - Lists all guests and posters with their IDs
   - Shows ready-to-use Stream Deck URLs for each
   - Run with: `pnpm streamdeck:ids`

4. **Comprehensive Documentation** - `docs/STREAM-DECK-SETUP.md`
   - Quick reference table of most common actions
   - Detailed examples for each action type
   - Guest workflow with step-by-step setup
   - Multi-action button examples
   - Troubleshooting guide

**Architecture Decision**:
- Port 3000 endpoints (Next.js) for simple actions (lower third, countdown start)
- Port 3002 endpoints (backend) for complex actions (poster control, OBS control)
- All convenience endpoints proxy to backend internally for consistency

**Files Created/Modified**:
- NEW: `app/api/actions/lower/guest/[id]/route.ts` - Guest lower third by ID
- NEW: `app/api/actions/poster/show/[id]/route.ts` - Poster by ID
- NEW: `app/api/actions/poster/hide/route.ts` - Simplified hide
- NEW: `app/api/actions/poster/next/route.ts` - Next poster
- NEW: `app/api/actions/poster/previous/route.ts` - Previous poster
- NEW: `scripts/list-streamdeck-ids.js` - ID discovery helper
- UPDATED: `docs/STREAM-DECK-SETUP.md` - Complete guide
- UPDATED: `package.json` - Added `streamdeck:ids` script

**User Experience**:
1. Create guests/posters in dashboard Assets page
2. Run `pnpm streamdeck:ids` to get list of IDs and URLs
3. Copy/paste URLs into Stream Deck buttons
4. Done - no manual typing of names/subtitles

**Lesson**: For hardware controller integration, provide both flexible APIs (custom text) AND convenience APIs (database IDs). Users prefer ID-based endpoints because they're more maintainable - changing guest info in database automatically updates all Stream Deck buttons.

---

## Stream Deck Plugin Development (October 2025)

### Native Plugin vs HTTP API
**Context**: User initially used HTTP API with Stream Deck's "Website" action. This works but requires manual URL/JSON configuration. Native plugin provides much better UX.

**Solution Implemented**:
1. **Native Plugin Structure** - Created Elgato SDK-compatible plugin with manifest.json
2. **8 Distinct Actions** - Each with dedicated property inspector UI
3. **Dynamic Dropdowns** - Populated from API using fetch() in property inspectors
4. **WebSocket Integration** - Live countdown updates displayed on buttons
5. **Build/Distribution System** - Package as .streamDeckPlugin for easy installation

**Architecture**:
```
Plugin (Node.js) ←→ Stream Deck Software
     ↓
API Calls (HTTP) → OBS Live Suite (port 3000/3002)
     ↓
WebSocket (WS) ← OBS Live Suite (port 3001)
```

**Key Implementation Details**:
- `plugin.js` runs in Node.js context (not browser)
- Property inspectors run in Chromium (can use modern web APIs)
- WebSocket connection managed in plugin.js, state broadcast to all actions
- Each action has independent property inspector HTML file
- Settings saved via Stream Deck's `setSettings` event

**Files Created**:
- `streamdeck-plugin/com.obslive.suite.sdPlugin/` - Main plugin directory
- `manifest.json` - Plugin metadata and action definitions
- `plugin.js` - Core logic, WebSocket manager, API client
- `actions/*/property-inspector.html` - Configuration UIs for each action
- `libs/sdpi.css` - Elgato-style property inspector CSS
- Build scripts and comprehensive documentation

**Lesson**: Native Stream Deck plugins require more upfront work than HTTP API but provide dramatically better UX. Dynamic dropdowns, live updates, and preset buttons are worth the investment for production use.

### WebSocket in Node.js Context
**Problem**: Plugin.js runs in Node.js (not browser), so must use `require('ws')` instead of browser WebSocket API.

**Solution**: 
```javascript
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001');
```

**Lesson**: Stream Deck plugin.js runs in Node.js environment. Use Node.js modules, not browser APIs. Property inspectors ARE browser-based and can use fetch(), WebSocket (browser), etc.

### Property Inspector Communication
**Pattern**: Property inspectors communicate with plugin.js via events:
- PI → Plugin: `sendToPlugin` event with custom payload
- Plugin → PI: `sendToPropertyInspector` event with custom payload
- Settings: PI uses `setSettings` to save, plugin receives via `didReceiveSettings`

**Example Flow**:
1. User opens property inspector
2. PI sends `{ event: 'refreshGuests' }` to plugin
3. Plugin fetches guests from API
4. Plugin sends `{ event: 'guestsList', guests: [...] }` to PI
5. PI populates dropdown with guest data

**Lesson**: Property inspector communication is event-based. Always include `event` field in payload for routing. Use `context` parameter to target specific button instances.

### Countdown Live Updates
**Challenge**: Display live countdown timer (MM:SS) on Stream Deck button that updates every second.

**Solution**:
1. Plugin connects to OBS Live Suite WebSocket on startup
2. Subscribe to `countdown` channel
3. Receive `tick` events with seconds remaining
4. Update global countdown state
5. Call `setTitle()` for all countdown action contexts
6. Format as MM:SS string

**Performance**: WebSocket tick events arrive every ~1s. SetTitle calls are lightweight (<1ms). No noticeable performance impact.

**Lesson**: For live data display on buttons, use WebSocket + setTitle(). Stream Deck handles button rendering efficiently. Track all action contexts globally to update multiple instances simultaneously.

### Icon Requirements
**Elgato Requirements**:
- Standard: 72x72 PNG
- Retina: 144x144 PNG (@2x suffix)
- Transparent background
- Dark UI compatible

**Naming Convention**:
- `action-name.png` (72x72)
- `action-name@2x.png` (144x144)

**Manifest Reference**:
```json
"Icon": "imgs/actions/action-name"
```
(No file extension - Stream Deck adds .png/@2x.png automatically)

**Lesson**: Icons are optional but highly recommended. Stream Deck shows action names if icons missing. Create simple, clear designs that work at small sizes. Use consistent color coding (e.g., green=start, red=stop, blue=info).

### Build and Distribution
**Development Workflow**:
1. Edit files in `com.obslive.suite.sdPlugin/`
2. Run `npm run install-plugin` to copy to Stream Deck folder
3. Restart Stream Deck software
4. Test changes

**Distribution**:
1. Run `npm run package` to create `.streamDeckPlugin` file
2. File is just a ZIP with special extension
3. Users double-click to install
4. Stream Deck extracts to plugins folder automatically

**Lesson**: Stream Deck plugins are just ZIP files with metadata. DistributionTool is optional - simple ZIP + rename works fine. Always test with `npm run install-plugin` before distributing.

---

## Future Considerations

### Things to Watch Out For
1. **Database migrations** - Currently no migration system. Add one before making schema changes in production.
2. **WebSocket scalability** - Current implementation works for single instance. For multi-instance deployment, need Redis pub/sub.
3. **File uploads** - When adding poster/image upload feature, implement proper validation and storage limits.

### Performance
- Overlay components use WebSocket for real-time updates - efficient and low latency
- Database queries are synchronous (better-sqlite3) - fine for local use, would need async driver for remote DB

---

## Don't Repeat These Mistakes

1. ❌ Don't use `any` types - always create proper interfaces
2. ❌ Don't define hooks after they're used in dependency arrays
3. ❌ Don't rely on API endpoints for critical initialization - use Next.js hooks
4. ❌ Don't block app startup on external service connections - fail gracefully
5. ❌ Don't commit `.env` files or secrets to git
6. ❌ Don't lazy-load singleton network services (WebSocket, HTTP servers) - initialize them at server startup
7. ❌ Don't assume API routes share the same process in Next.js dev mode - always use ServiceEnsurer pattern

---

## Quiz System Implementation (October 2025)

### COMPLETE: Full System Implemented ✅

All features from the enhancement plan have been implemented. The quiz system now includes complete question management, session building, player selection, multi-mode overlays, and live scoring.

### Option C: Core Essentials Complete (Phase 1)

After initial full-system implementation, user requested enhanced UI. Three options were proposed:
- **Option A**: Full system (player selector, all round types, advanced host UI, all overlay modes)
- **Option B**: Backend first (complete CRUD, session builder)
- **Option C**: Core essentials (backend + basic management UI + one overlay mode) ✅ **SELECTED**

#### What Was Implemented

**Backend Extensions** (`lib/services/QuizStore.ts`, `server/api/quiz.ts`):
- Added question bank CRUD methods (`createQuestion`, `updateQuestion`, `deleteQuestion`, `getAllQuestions`)
- Added round bank CRUD methods
- Question bank persisted to `data/quiz/questions.json`
- API endpoints: `GET /api/quiz/questions`, `POST /api/quiz/questions`, `PUT /api/quiz/questions/:id`, `DELETE /api/quiz/questions/:id`

**Question Manager UI** (`/quiz/manage`):
- `app/quiz/manage/page.tsx` - Main manager page with two-column layout
- `components/quiz/manage/QuestionList.tsx` - Lists all questions with edit/delete actions
- `components/quiz/manage/QuestionEditor.tsx` - Form for creating/editing questions
  - Type selector: QCM, Image QCM, Closest, Open
  - Question text input
  - Image upload (integrated with existing `/api/assets/quiz` endpoint)
  - Options editor for QCM (radio buttons for correct answer)
  - Points and time configuration

**Enhanced Host Panel** (`/quiz/host`):
- Current question display with full details (text, options, type, points)
- Next question preview
- Round info and phase status
- Organized controls: Main (8 buttons), Timer (3 buttons), Zoom (2 buttons), Buzzer (2 buttons)
- Real-time state updates via WebSocket
- Auto-refresh after API calls

**Enhanced QCM Overlay** (`components/quiz/QuizQcmDisplay.tsx`):
- Text mode: Horizontal bars with vote percentages (existing)
- **Image mode**: 2x2 grid layout with:
  - Image preview for each option
  - Vote counts and percentages
  - Progress bar overlay at bottom of each tile
  - Question text header
- Mode detection: checks if all options are URLs

**Data Flow**:
1. Host creates questions via `/quiz/manage`
2. Questions saved to `QuizStore` → `data/quiz/questions.json`
3. Host loads example session or builds custom session
4. Host controls quiz via `/quiz/host`
5. Overlay at `/overlays/quiz` subscribes to `quiz` channel
6. On `question.show`, overlay fetches question details from `/api/quiz/state`
7. Overlay renders mode-specific display (text bars or image grid)

#### Key Decisions

**Why Not Full Implementation**:
- User wanted to prioritize getting a working system quickly
- Image QCM is the most visually distinct mode (vs text QCM)
- Zoom/Buzz modes require more complex UI and state management
- Question management was the critical missing piece for real usage

**Persistence Strategy**:
- Question bank → `data/quiz/questions.json` (separate from sessions)
- Sessions → `data/quiz/sessions/{id}.json` (include full question objects)
- This allows reusing questions across multiple sessions

**Image Detection Logic**:
- Simple heuristic: if all options start with "http", treat as image mode
- Could be enhanced with explicit `optionsAreImages` flag if needed

#### Testing Status
- All 36 existing quiz tests still pass
- No new tests added (Option C focused on UI, existing backend tested)
- Manual testing required for new UI components

#### Files Created/Modified
**Created**:
- `app/quiz/manage/page.tsx`
- `components/quiz/manage/QuestionList.tsx`
- `components/quiz/manage/QuestionEditor.tsx`

**Modified**:
- `lib/services/QuizStore.ts` (+90 lines) - CRUD methods, persistence
- `server/api/quiz.ts` (+38 lines) - Question endpoints
- `components/quiz/QuizQcmDisplay.tsx` (+50 lines) - Image mode
- `components/quiz/QuizRenderer.tsx` (+15 lines) - Fetch question details
- `app/quiz/host/page.tsx` (refactored) - Enhanced display

### Full Implementation Complete (Phase 2) ✅

User requested: "go on" → implemented all remaining features from the plan.

**What Was Added (Phase 2)**:

1. **Session Builder UI** (`/quiz/manage` - Session Builder tab):
   - `PlayerSelector.tsx`: Select 4 studio players from guests DB, assign buzzer IDs
   - `RoundEditor.tsx`: Compose rounds from question bank, reorder questions
   - `SessionBuilder.tsx`: Arrange rounds, configure session, one-click creation
   - Backend: `POST /api/quiz/session/create` endpoint

2. **Multi-Mode Overlay System**:
   - `QuizZoomReveal.tsx`: Mystery image with progressive dezoom (11x→1x scale), zoom level indicator, buzzer winner display
   - `QuizOpenDisplay.tsx`: Open questions with host scoring message, optional viewer answers
   - `QuizRenderer.tsx`: Auto-detection logic to switch between QCM/Zoom/Open modes

3. **Enhanced Host Panel**:
   - `LiveScoreboard.tsx`: Studio players + top 5 viewers with real-time updates
   - Refactored host page: 4-column grid (current question | next question | scoreboard)
   - Scoreboard fetches from session state, updates via WebSocket

**Total Implementation**:
- **9 new files** (~1,050 lines)
- **6 files modified** (~290 lines)
- **Total**: ~1,400 lines of production code

**Architecture Decisions**:

1. **Player Selection Integration**: Reused existing `/api/assets/guests` endpoint, no duplication
2. **Round Building**: Client-side composition, server-side validation on session create
3. **Mode Detection**: Type-based switching in renderer (image_zoombuzz, closest+media → Zoom; open → Open; else → QCM)
4. **Image QCM Detection**: Heuristic check if all options start with "http"
5. **Session Persistence**: POST creates session in QuizStore, existing save/load for JSON export

**Testing Status**:
- All 36 existing tests pass ✅
- No new tests added (UI-focused phase)
- Manual testing required for new components

**Files Summary**:
```
Phase 1 (Option C):
  - Backend CRUD: QuizStore + API routes
  - Question Manager: List + Editor
  - Enhanced QCM: Text + Image modes
  - Enhanced Host: Current/Next display

Phase 2 (Full Implementation):
  - Session Builder: Player + Round + Session
  - Zoom Reveal: Mystery image overlay
  - Open Display: Host scoring overlay
  - Live Scoreboard: Real-time scores
```

**What's Still Future Enhancements**:
- Manual scoring form (host assigns points via UI, not just reveal)
- Session templates (save/load common structures)
- Question import/export (bulk operations)
- Media library (browse all quiz images)
- Advanced zoom controls (manual stepping, easing curves)
- Answer history viewer (see all chat answers)
- Stats dashboard (historical performance)

## Quiz System Architecture (October 2025) - Initial Implementation

### Implementation Approach
**Context**: Added a complete quiz system with on-set players + Twitch viewers, multiple question modes, real-time scoring, and Streamer.bot integration.

**Architecture Decisions**:
1. **Isolated from Dashboard** - Quiz has separate routes (`/quiz/host`, `/overlays/quiz`) independent of dashboard
2. **Reused Existing Patterns**:
   - WebSocketHub + ChannelManager for pub/sub (added `QUIZ` channel)
   - DatabaseService for player data (reused `guests` table)
   - PathManager for session persistence (JSON in `data/quiz/sessions/`)
   - File upload pattern for quiz images (`/uploads/quiz`)
3. **Service Separation** (SRP):
   - `QuizStore`: in-memory session + JSON persistence
   - `QuizManager`: state machine orchestration + WS broadcasts
   - `QuizScoringService`: scoring logic for all modes
   - `QuizBuzzerService`: first-hit/steal mechanics
   - `QuizViewerInputService`: flood control + vote aggregation
   - `QuizZoomController`: auto-zoom for image modes
   - `QuizTimer`: tick broadcasts
4. **Backend Split**:
   - `/api/quiz` (Express @ 3002): host controls, session, config
   - `/api/quiz-bot` (Express @ 3002): Streamer.bot webhook bridge
5. **Frontend Split**:
   - Host: `/quiz/host` (client controls)
   - Overlay: `/overlays/quiz` (transparent 1920x1080)
   - Components: `QuizRenderer`, `QuizQcmDisplay`, `QuizTimerDisplay`, `QuizPlayersDisplay`

**Files Created** (all <150 lines per SRP):
- Models: `lib/models/Quiz.ts`, `lib/models/QuizEvents.ts`
- Services: 7 focused service files
- Backend: `server/api/quiz.ts`, `server/api/quiz-bot.ts`
- Frontend: 1 host page, 1 overlay page, 4 display components
- Upload: `app/api/assets/quiz/route.ts`
- Tests: 3 unit tests + 1 functional test
- Examples: `lib/services/QuizExamples.ts` with placeholder images

**Key Patterns**:
- State machine: idle → show_question → accept_answers → lock → reveal → score_update → interstitial
- WS events: `quiz.start_round`, `question.show/lock/reveal`, `vote.update`, `timer.tick`, `zoom.*`, `buzzer.*`
- Chat commands: `!a/!b/!c/!d` (QCM), `!n <int>` (closest), `!rep <text>` (open)
- Debouncing: buzzer lockMs, viewer cooldowns, global RPS caps

**Testing Strategy**:
- Unit tests for scoring, buzzer, viewer input (isolated logic)
- Functional test for full workflow (state transitions)
- Example questions for manual smoke testing

**Lesson**: For complex multi-mode features, break into small services with single responsibilities. WebSocket pub/sub scales well for real-time overlays when each service publishes domain events. Reusing existing guests DB avoided duplication while keeping quiz isolated.

---

## Quiz Host Interface Redesign (October 2025)

### Professional 3-Panel Layout Implementation

**Context**: User requested complete UI overhaul of quiz host interface with detailed French specification for professional broadcast control.

**Architecture Decisions**:
1. **Component Modularity** - Split into focused, reusable components:
   - `QuizHostNavigator` (sidebar): Session/round/question tree navigation
   - `QuizHostTopBar` (global): Main control flow buttons
   - `QuizQuestionStage` (center): Question display + player assignment
   - `QuizPlayersPanel` (right): Studio players + viewers + log
   - `PlayerAvatarChip` (shared): Draggable avatar component
   - `useQuizHostState` (hook): Centralized state management

2. **Drag-and-Drop Implementation**:
   - Used native HTML5 drag-and-drop API (no libraries needed)
   - Player avatars in right panel are draggable
   - QCM options act as drop zones with visual feedback (dashed border)
   - `dataTransfer` carries player ID as plain text
   - Assigned avatars displayed on options (non-draggable)

3. **State Management Pattern**:
   - Custom hook `useQuizHostState` centralizes all state and API calls
   - WebSocket subscription for real-time updates
   - Actions object exposes clean interface for components
   - Automatic state refresh after API calls

4. **Keyboard Shortcuts**:
   - Implemented via global `useEffect` with `keydown` listener
   - Guards against input/textarea to avoid conflicts
   - Space = Lock or Reveal (context-aware)
   - Arrows = navigation, T = +10s, V = toggle viewer input

5. **Files Created** (all <150 lines per SRP):
   - `components/quiz/host/QuizHostNavigator.tsx` (~150 lines)
   - `components/quiz/host/QuizHostTopBar.tsx` (~70 lines)
   - `components/quiz/host/QuizQuestionStage.tsx` (~270 lines) ⚠️ exceeds target, but acceptable for main stage
   - `components/quiz/host/QuizPlayersPanel.tsx` (~120 lines)
   - `components/quiz/host/PlayerAvatarChip.tsx` (~40 lines)
   - `components/quiz/host/useQuizHostState.ts` (~175 lines)

6. **Backend Additions**:
   - Added `POST /quiz/question/prev` - Navigate to previous question
   - Added `POST /quiz/question/reset` - Reset question state (danger zone)
   - Added `POST /quiz/viewer-input/toggle` - Control viewer input acceptance

**Key UX Features**:
- Round accordion auto-expands current round
- Question badges show state: Ready/Accepting/Locked/Revealed
- Round badges show state: Not started/Live/Done
- Phase-aware button states (disabled when action not available)
- Timer turns red when <10 seconds remaining
- Progress bars on QCM options show viewer vote percentages
- Correct answer highlights green on reveal phase

**Design Decisions**:
- **Removed** "Load Example" and "Reset Session" buttons (per spec)
- **Danger zone** limited to "Reset Question" only
- **Color coding**: Blue=QCM, Green=Image, Orange=Closest, Purple=Open
- **Viewer stats**: Real-time vote counts + percentages on options
- **Player assignment**: Visual feedback during drag operation

**Lessons**:
1. **Native HTML5 Drag-and-Drop** works well for simple use cases without library overhead
2. **Component size tradeoff**: QuizQuestionStage exceeds 150 lines but splitting would create artificial boundaries (question display + options + timer are one logical unit)
3. **Keyboard shortcuts** need guards for input fields to avoid hijacking typing
4. **Phase-aware UI**: Button states should reflect what actions are valid in current phase
5. **Real-time updates**: Combining WebSocket for broadcasts + HTTP for actions works well

**Future Enhancements** (marked as TODOs in code):
- Player assignment persistence (currently UI-only)
- Click-to-assign alternative to drag-and-drop (for accessibility)
- Event log with real events (currently static placeholders)
- Quick assign buttons (A/B/C/D) in players panel
- Viewer vote rate-limit indicator (msg/s counter)
- Manual player scoring for Open/Closest questions

**Files Modified**:
- `app/quiz/host/page.tsx` - Completely rewritten to use new 3-panel layout
- `server/api/quiz.ts` - Added prev/reset/toggle endpoints
- `components/quiz/host/useQuizHostState.ts` - New state management hook

**Testing Status**:
- Manual testing required for new UI components
- No breaking changes to backend services (all existing tests should pass)
- Drag-and-drop tested in Chrome/Edge (Chromium-based browsers)

---

## Quiz Session Persistence & Management (2025-10-21)

**BUG**: Quiz session and question bank were not persisting to disk despite having save/load methods.

**ROOT CAUSE**: `PathManager.ensureDirectories()` did not include the quiz directories (`quiz/` and `quiz/sessions/`). Even though `QuizStore.saveToFile()` had directory creation logic, it relied on PathManager's initialization. The directories were never created on app startup.

**FIX**: 
- Added `getQuizDir()` and `getQuizSessionsDir()` methods to PathManager
- Added quiz directories to `ensureDirectories()` array
- Simplified QuizStore methods to use PathManager methods instead of hardcoded paths
- Removed redundant `existsSync()` checks in QuizStore since PathManager now ensures directories exist

**ENHANCEMENT 1**: After fixing persistence, added complete session management:

**Backend** (`lib/services/QuizStore.ts`, `server/api/quiz.ts`):
- `listSessions()` - List all saved sessions with metadata (title, rounds, createdAt)
- `deleteSession()` - Delete session by ID
- `updateSessionMetadata()` - Update session title only
- API endpoints: `GET /sessions`, `PUT /session/:id`, `DELETE /session/:id`

**UI** (`components/quiz/manage/SessionManager.tsx`):
- Replaced "Session Builder" tab with "Sessions" manager
- List all saved sessions with metadata display
- Show ACTIVE badge for currently loaded session
- Actions per session: Load, Edit (full), Delete
- Global actions: Build New Session, Save Current, Refresh
- Empty state with call-to-action
- Delete confirmation dialog
- Auto-refresh after operations

**ENHANCEMENT 2**: Added full session editing (questions, rounds, players):

**Backend** (`server/api/quiz.ts`):
- `POST /session/:id/update` - Update complete session content (not just metadata)
- Loads session from file, updates all fields, saves back to disk
- Preserves existing player scores when updating player list

**UI** (`components/quiz/manage/SessionBuilder.tsx`):
- Added `sessionId` prop to load existing sessions
- Added `onBack` callback for navigation
- Loads session data on mount if sessionId provided
- Distinguishes "Create New" vs "Edit Session" modes
- Updates correct endpoint based on mode (create vs update)
- Back button returns to session manager

**Integration** (`app/quiz/manage/page.tsx`):
- "Edit" button in SessionManager navigates to builder with sessionId
- "Build New" button navigates to builder without sessionId
- Builder shows "Back" arrow to return to sessions list
- State properly cleared when switching between create/edit modes

**LESSON**: When adding new data storage features, always update PathManager's `ensureDirectories()` to include new paths. Centralize path management - don't rely on ad-hoc directory creation scattered across service classes. For CRUD operations, provide both API and UI simultaneously - they're easier to test together and provide immediate value. When building edit modes, reuse the same form/builder component with conditional logic rather than duplicating UI code.

---

## Quiz Host & Overlay Synchronization (2025-10-21)

**CONTEXT**: After implementing quiz host redesign, real-time synchronization between host panel and overlay was incomplete. Events were being emitted but not properly acknowledged, state wasn't updating, and reveal display was missing.

**ISSUES IDENTIFIED**:
1. **WebSocket Message Structure Mismatch**: Host and overlay were accessing `msg.id` and `msg.type` directly, but backend wraps events in `{ channel: "quiz", data: { id, type, payload } }`
2. **No Acknowledgments**: Host panel wasn't sending acks for received events → "No ack received" warnings in backend logs
3. **Missing Events**: No `answer.assign`, `question.revealed`, `phase.update` events for real-time state sync
4. **Timer Too Fast**: Timer decremented every 500ms instead of every 1000ms
5. **No Auto-Scoring**: Reveal didn't automatically calculate and broadcast scores
6. **Overlay Not Showing Question**: After fixing acks, question still not displayed due to incorrect message parsing

**SOLUTIONS IMPLEMENTED**:

### 1. WebSocket Event Acknowledgments

**Host Panel** (`components/quiz/host/useQuizHostState.ts`):
```typescript
ws.current.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  
  // Send ack for every event with ID (msg.data contains actual event)
  if (msg.data?.id && ws.current?.readyState === WebSocket.OPEN) {
    ws.current.send(JSON.stringify({
      type: "ack",
      eventId: msg.data.id,
      success: true
    }));
  }
  
  // Handle event using msg.data.type and msg.data.payload
  handleEvent(msg.data);
};
```

**Overlay** (`components/quiz/QuizRenderer.tsx`):
- Same ack logic implemented
- Fixed to parse `msg.data` instead of top-level `msg`

### 2. New WebSocket Events

**Added to `lib/models/QuizEvents.ts`**:
- `answer.assign` - Player assigned to answer option (for live avatar positioning)
- `question.revealed` - Answer revealed with scoring complete
- `question.finished` - Question complete, ready for next
- `phase.update` - Phase state changed
- `question.next_ready` - Next question available

### 3. Player Answer Assignment System

**Backend** (`lib/services/QuizManager.ts`):
- Added `playerAnswers: Record<string, Answer>` to Session
- `submitPlayerAnswer()` stores answer and broadcasts `answer.assign` event
- Answers cleared when new question shown

**Frontend**:
- Drag-and-drop avatars onto options
- Click fallback: click avatar → click option
- Real-time avatar positioning via `answer.assign` WebSocket subscription
- Reveal shows ✓ (green) or 0 (gray) badges on player avatars

### 4. Auto-Scoring After Reveal

**Backend** (`lib/services/QuizManager.ts` - `reveal()` method):
```typescript
private async applyScoring(q: Question, sess: Session) {
  for (const [playerId, answer] of Object.entries(sess.playerAnswers)) {
    let points = 0;
    // QCM: check if answer.option === question.correct
    // Closest: check distance from target
    // Open: manual scoring (no auto-score)
    
    const player = sess.players.find(p => p.id === playerId);
    if (player) {
      player.score += points;
      await this.channel.publish(
        OverlayChannel.QUIZ,
        "score.update",
        { user_id: playerId, delta: points, total: player.score }
      );
    }
  }
  
  await this.channel.publish(
    OverlayChannel.QUIZ,
    "leaderboard.push",
    { topN: this.getTopViewers(5) }
  );
}
```

- Scores calculated immediately after reveal
- `score.update` emitted per player
- `leaderboard.push` emitted with updated top viewers

### 5. Reveal Display with Badges

**Host Panel** (`components/quiz/host/QuizQuestionStage.tsx`):
- Correct answer highlighted green
- Incorrect options dimmed
- Avatar badges: ✓ (green) for correct, 0 (gray) for incorrect
- Badges positioned absolutely over avatar chips

**Overlay**:
- Same badge system
- Synced via `question.reveal` and `question.revealed` events

### 6. Phase Synchronization

**Backend**:
- `emitPhaseUpdate()` called on every phase transition
- Broadcasts `phase.update{phase, question_id}` to all clients

**Frontend** (`components/quiz/host/QuizHostTopBar.tsx`):
- Color-coded phase badge: Idle (gray), Accepting (green), Locked (yellow), Revealed (blue), Scoring (purple)
- Updates in real-time via WebSocket subscription

### 7. Viewer Votes Display

**Host Panel**:
- Shows vote counts per option (e.g., "45 votes")
- Shows percentages per option (e.g., "23%")
- Real-time updates via `vote.update{counts, percentages}` event
- Progress bars showing vote distribution

**Event Subscription** (`useQuizHostState.ts`):
```typescript
if (eventType === "vote.update" && payload) {
  setState(prev => ({
    ...prev,
    viewerVotes: payload.counts,
    viewerPercentages: payload.percentages
  }));
}
```

### 8. Top Viewers Leaderboard

- Subscribes to `leaderboard.push{topN}` event
- Updates immediately after reveal
- Shows top 5 viewers with scores
- Sorted by score (highest first)

### 9. Timer Fix

**Problem**: Timer was decrementing every 500ms while ticks fired every 500ms → 2x speed

**Solution** (`lib/services/QuizTimer.ts`):
```typescript
async start(seconds: number, phase: string) {
  this.tickCount = 0;
  this.interval = setInterval(async () => {
    this.tickCount++;
    
    // Only decrement every 2 ticks (1000ms)
    if (this.tickCount >= 2) {
      this.tickCount = 0;
      if (this.seconds > 0) this.seconds -= 1;
    }
    
    // Broadcast tick every 500ms for smooth UI
    await this.channel.publish(OverlayChannel.QUIZ, "timer.tick", {
      s: this.seconds,
      phase: this.phase
    });
  }, 500);
}
```

- UI updates every 500ms (smooth countdown)
- Seconds decrement every 1000ms (accurate timing)

### 10. Event-Driven State Updates

**Optimized State Management** (`useQuizHostState.ts`):
- Timer ticks update state directly (no reload)
- Player assignments update state directly
- Vote updates update state directly
- Phase updates update state directly
- Only reload full state for complex events (reveal, score updates)

```typescript
if (eventType === "timer.tick" && payload) {
  setState(prev => ({ ...prev, timerSeconds: payload.s, ... }));
} else if (eventType === "answer.assign" && payload) {
  setState(prev => ({
    ...prev,
    playerChoices: { ...prev.playerChoices, [payload.player_id]: payload.option }
  }));
} else {
  loadState(); // Full reload only when necessary
}
```

**FILES MODIFIED**:
- `components/quiz/host/useQuizHostState.ts` - Event subscriptions, state management, acks
- `components/quiz/host/QuizQuestionStage.tsx` - Viewer votes, reveal badges
- `components/quiz/host/QuizHostTopBar.tsx` - Phase badge display
- `components/quiz/host/QuizPlayersPanel.tsx` - Hidden event log
- `components/quiz/host/PlayerAvatarChip.tsx` - Click handler, selection state
- `components/quiz/QuizRenderer.tsx` - WebSocket ack, event handling
- `app/quiz/host/page.tsx` - Wired new props, toast notifications
- `lib/models/Quiz.ts` - Added playerAnswers field
- `lib/models/QuizEvents.ts` - Added 5 new event types
- `lib/services/QuizManager.ts` - Auto-scoring, phase updates, leaderboard
- `lib/services/QuizTimer.ts` - Fixed 2x speed bug with tick counter
- `server/api/quiz.ts` - Added endpoints for select, reset, player answer

**LESSONS**:
1. **WebSocket Message Parsing**: Always verify the exact structure of incoming messages. Backend may wrap events in metadata (channel, timestamp, etc.)
2. **Acknowledgment Pattern**: Critical for reliable event delivery. Client MUST send ack for every event with an ID.
3. **Message Structure Documentation**: Backend sends `{ channel, data: { id, type, payload } }`, not flat `{ id, type, payload }`
4. **Timer Accuracy**: When broadcasting frequently for UI smoothness, use a tick counter to ensure time calculations remain accurate
5. **Event-Driven UI**: Minimize full state reloads by handling specific events with targeted state updates
6. **Auto-Scoring Workflow**: Reveal should be atomic: show answer → calculate scores → broadcast updates → mark complete
7. **Real-Time Feedback**: Players and host need immediate visual confirmation of assignments, votes, and scores

---

## Quiz Host Session Selector (2025-10-21)

**UX IMPROVEMENT**: Added session selection directly in host panel instead of requiring navigation to management view.

**PROBLEM**: Users had to navigate to `/quiz/manage` to load a session, then navigate back to `/quiz/host`. This created unnecessary friction in the workflow.

**SOLUTION**: When no session is loaded, host panel displays a session selector:
1. Fetches all sessions from `GET /api/quiz/sessions`
2. Displays list with title, rounds count, and creation date
3. "Load Session" button calls `POST /api/quiz/session/:id/load`
4. After loading, host panel shows normally
5. Empty state with "Create New Session" link to `/quiz/manage`

**IMPLEMENTATION**:
- Created `SessionSelector.tsx` component (150 lines, focused on session loading UI)
- Added conditional rendering in host page: `if (!state.session)` → show selector
- Added `loadSession()` action to `useQuizHostState` hook
- Used existing backend endpoints (no API changes needed)

**FILES CREATED/MODIFIED**:
- NEW: `components/quiz/host/SessionSelector.tsx` - Session loading UI with list and empty state
- `app/quiz/host/page.tsx` - Conditional rendering based on session state
- `components/quiz/host/useQuizHostState.ts` - Added `loadSession()` action

**UX FLOW**:
```
/quiz/host (no session) → SessionSelector
  ├─ Sessions exist → List with "Load" buttons → Host panel
  └─ No sessions → Empty state → "Create New" → /quiz/manage
```

**DESIGN DECISIONS**:
- Centered layout with max-width for visual focus
- Icons (Play, Users, Calendar) for quick visual parsing
- Hover states on session cards
- Refresh button to reload list without page reload
- Toast notification on successful load

**FIX**: Backend returns `{ sessions: [...] }` but frontend expected array directly. Fixed with `data.sessions || []`.

**LESSON**: Reduce navigation friction by allowing critical actions at the point of need. Condition: show selector if `!session || session.rounds.length === 0`. Added "Change" button in navigator to unload session (calls `/session/reset` which creates empty default session). Always check API response structure - backend wraps arrays in objects for consistency.

---

## Quiz Reveal & Player Assignments in Overlay (2025-10-21)

**ENHANCEMENTS**: Visual feedback for reveal state and player assignments in both host and overlay.

**ISSUES FIXED**:
1. Correct answer not visually distinct on reveal
2. Player assignments only visible in host, not overlay
3. Votes/assignments not resetting when changing questions

**SOLUTION**:
- **Host view**: Correct answer gets `ring-4 ring-green-300 bg-green-100`, wrong answers fade to `opacity-60`
- **Overlay**: Correct answer with `animate-pulse ring-8 ring-green-400`, wrong answers fade to `opacity-50`
- **Player avatars**: Show on options in overlay (rendered as small circles with avatar or initials)
- **Reset on question.show**: Clear `voteCounts`, `votePercentages`, `playerAssignments` 
- **New event handler**: `answer.assign` updates `playerAssignments` in overlay state

**FILES MODIFIED**:
- `components/quiz/QuizQcmDisplay.tsx` - Added reveal animations, player avatars, correct answer handling
- `components/quiz/QuizRenderer.tsx` - Added `answer.assign` handler, reset logic on question.show
- `components/quiz/host/QuizQuestionStage.tsx` - Enhanced correct answer styling

**BUG FIX**: Runtime error `Cannot read properties of undefined (reading '0')` when accessing `p.name[0]`. Fixed by:
- Adding `.filter(p => p && p.name)` before mapping players
- Using optional chaining `p.name?.[0] || "?"` as fallback
- Applied to `QuizPlayersDisplay.tsx` and `QuizQcmDisplay.tsx`

**ENHANCEMENTS (2025-10-21)**:
1. **Avatar Display Fix**: Changed from showing "?" to properly rendering avatars and initials
   - Filter players with `.filter(p => p && (p.name || p.avatar))`
   - Proper image rendering with `<img>` tag in overflow:hidden container
   - Uppercase initials for better readability
   
2. **Softer Glow Animation**: Replaced Tailwind's `animate-pulse` with custom `softGlow` animation
   - Duration: 2s (was ~1s with pulse)
   - Ease-in-out timing (smoother)
   - Custom box-shadow glow effect
   - Less jarring, more elegant
   
3. **Question Transition**: Added "hiding" phase when changing questions
   - Flow: question.show → set phase="hiding" → wait 400ms → load new question → phase="accept_answers"
   - All displays hide during transition (QCM, Timer, Zoom, Open)
   - Votes, percentages, and assignments reset before showing new question
   - Clean visual transition between questions

**FILES MODIFIED**:
- `components/quiz/QuizQcmDisplay.tsx` - Custom animation, avatar rendering, hiding phase
- `components/quiz/QuizRenderer.tsx` - Transition delay logic
- `components/quiz/QuizTimerDisplay.tsx` - Hide during transition
- `components/quiz/QuizZoomReveal.tsx` - Hide during transition
- `components/quiz/QuizOpenDisplay.tsx` - Hide during transition

**FIX (2025-10-21)**: Player assignment bubbles not appearing in overlay. Root cause: property name mismatch.

**ISSUE**: Backend returns `displayName` and `avatarUrl`, but components checked for `name` and `avatar`.

**SOLUTION**:
- Added helper functions: `getPlayerName()` and `getPlayerAvatar()` that check both property names
- Updated all player interfaces to accept both: `name | displayName` and `avatar | avatarUrl`
- Enhanced visibility: `bg-gray-700` + `border-2 border-white` (was semi-transparent)
- Applied to: `QuizQcmDisplay.tsx`, `QuizPlayersDisplay.tsx`
- Removed debug console.log statements

Now properly displays player avatars and initials in overlay, matching host view.

---

## Quiz Overlay - Image Questions Display Fix (2025-10-22)

**ISSUE**: Questions with images were not displaying properly in the overlay. Only 4 text answers appeared, without the question image.

**ROOT CAUSE**: 
- The overlay had two display modes: 
  1. **Image Grid Mode**: 2x2 grid when OPTIONS are image URLs
  2. **Text Bar Mode**: Horizontal bars for text options
- For questions with `type: "image"` where the QUESTION has an image (`media` field) but OPTIONS are text (e.g., "A. Cat, B. Dog, C. Bird, D. Fish"), the system fell through to text bar mode without displaying the question image.
- The condition `optionsAreImages && optionTexts.every(o => o.startsWith("http"))` was checking if options themselves were images, not if the question had an image.

**SOLUTION**:
1. **Separated concerns**: Created `optionsAreImageUrls` variable to specifically check if the options array contains URLs
2. **Added question image display**: In text bar mode, now checks for `question.media` and displays the image above the answer options if present
3. **Updated interface**: Added `media?: string | null` to `QuizQcmDisplayProps` 
4. **Improved layout**: Centered layout with question image → question text → answer bars (vertically stacked)

**DISPLAY LOGIC NOW**:
- **Options are images** (`options: ["http://...", "http://...", ...]`) → 2x2 image grid
- **Question has image** (`type: "image"`, `media: "http://..."`, `options: ["Cat", "Dog", ...]`) → Image + Text bars
- **Text only** (`type: "qcm"`, no media) → Text bars only

**FILES MODIFIED**:
- `components/quiz/QuizQcmDisplay.tsx` - Added question image display in text bar mode, separated image detection logic
- `components/quiz/QuizRenderer.tsx` - Fixed `optionsAreImages` detection to only check if options are URLs (not just if type is "image")

**LESSON**: When building multi-mode displays, clearly distinguish between:
1. Question metadata (text, image, type)
2. Answer format (text options vs image options)

Don't conflate "question with image" and "options are images" - they're different use cases. A question can have an image while options are text (most common), or both question and options can be images (rare), or neither (text-only QCM).

---

## Quiz Overlay - Image Display and Animation Enhancements (2025-10-22)

**CONTEXT**: After fixing image questions display, user requested layout adjustments and fade animations.

### Layout Refinements

**ISSUE 1**: Question image was centered and too large, hiding players on screen and overlapping score panel.

**SOLUTION**:
- Moved score panel from bottom-left to top-left (`top-6 left-6`)
- Repositioned question image to bottom-left (`bottom-10 left-8`)
- Reduced image size from `max-w-2xl max-h-96` (896×384px) to `max-w-md max-h-80` (448×320px)
- Aligned image at same Y-axis as question text and answer bars
- Answer bars remain at bottom of screen (`bottom-10`)

**FINAL LAYOUT**:
```
┌─────────────────────────────────────────────────┐
│ SCORES (top-left)          TIMER (top-center)  │
│                                                 │
│                                                 │
│           PLAYERS/PEOPLE (center area)          │
│                                                 │
│                                                 │
│ IMAGE      QUESTION TEXT                        │
│ (left)     ANSWER BARS (A/B/C/D)               │
└─────────────────────────────────────────────────┘
```

### Fade Animations

**REQUIREMENT**: Add sequenced fade-in/fade-out animations for question transitions.

**IMPLEMENTATION**:

1. **Fade-in Sequence** (new question):
   - Question text: Appears immediately (50ms delay)
   - Question image: Fades in after 1 second
   - Answer options: Fade in after 3 seconds
   - All use 700ms transition duration

2. **Fade-out** (next question):
   - When "Next Question" clicked, phase → "hiding"
   - All elements (text, image, options) fade out simultaneously
   - After 400ms, new question loads and fade-in sequence starts

3. **Phase Independence**:
   - Animations only trigger on question changes
   - Lock/Reveal actions do NOT trigger re-animation
   - Elements stay visible through phase transitions

**TECHNICAL DETAILS**:

- **React Hooks Order**: All hooks must be called before conditional returns (Rules of Hooks)
- **Combined useEffect**: Single effect handles both fade-out (hiding phase) and fade-in (new question)
- **Question Change Detection**: Uses `useMemo` to stringify question object for reliable change detection
- **Early Return Prevention**: Returns early from useEffect during "hiding" to prevent fade-in timers from starting

**STATE FLOW**:
```
User clicks "Next Question"
  ↓
phase = "hiding" (elements fade to opacity: 0)
  ↓
400ms delay (QuizRenderer transition)
  ↓
New question loads + phase = "accept_answers"
  ↓
questionId changes → triggers useEffect
  ↓
Fade-in sequence: text (50ms) → image (1s) → options (3s)
```

**FILES MODIFIED**:
- `components/quiz/QuizQcmDisplay.tsx` - Added fade animations, repositioned elements
- `components/quiz/QuizScorePanel.tsx` - Moved from bottom to top
- `components/quiz/QuizRenderer.tsx` - Already had "hiding" phase logic in place

**LESSONS**:
1. **React Hooks Rules**: Never call hooks after conditional returns or inside conditions
2. **Animation Timing**: Coordinate transitions between parent (QuizRenderer) and child (QuizQcmDisplay) components
3. **Phase vs Question Changes**: Use separate triggers for different animation purposes (phase for fade-out, question ID for fade-in)
4. **Layout Balance**: Consider all UI elements when positioning - scores, timer, image, answers, and most importantly, the live video feed of people
5. **Early Returns in useEffect**: Can prevent unwanted side effects (timers) from running during transitional states

---

*Last updated: October 2025*

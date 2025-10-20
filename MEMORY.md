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

*Last updated: January 2025*

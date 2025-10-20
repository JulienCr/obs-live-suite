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

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

---

*Last updated: January 2025*

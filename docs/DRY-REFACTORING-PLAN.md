# DRY Refactoring Plan - OBS Live Suite

## Executive Summary

This plan addresses code duplication across the codebase, estimated at **800-1200 lines** of duplicated code. The refactoring is organized into 4 iterations with parallel subagent squads.

---

## Iteration 1: Foundation - Base Classes & Utilities (Priority: HIGH)

### Squad A: Singleton & Repository Abstractions

**Task 1.1: Create Generic Singleton Base**
- **Files to create:** `lib/utils/Singleton.ts`
- **Impact:** 20+ services/repos with identical getInstance() pattern
- **Estimated savings:** ~300 lines

```typescript
// Pattern to extract from all services:
export abstract class Singleton<T> {
  private static instances = new Map<string, any>();

  protected static getInstance<T extends Singleton<T>>(
    this: new () => T,
    key: string
  ): T {
    if (!Singleton.instances.has(key)) {
      Singleton.instances.set(key, new this());
    }
    return Singleton.instances.get(key);
  }
}
```

**Task 1.2: Create BaseRepository<T> Generic Class**
- **File to create:** `lib/repositories/BaseRepository.ts`
- **Files to refactor:**
  - `lib/repositories/GuestRepository.ts`
  - `lib/repositories/PosterRepository.ts`
  - `lib/repositories/ThemeRepository.ts`
  - `lib/repositories/ProfileRepository.ts`
- **Common methods to extract:**
  - `getAll(filter?: boolean): T[]`
  - `getById(id: string): T | undefined`
  - `create(data: Partial<T>): T`
  - `update(id: string, updates: Partial<T>): T`
  - `delete(id: string): void`
- **Estimated savings:** ~400 lines

**Task 1.3: Create Row Transformation Utilities**
- **File to create:** `lib/utils/dbTransformations.ts`
- **Functions:**
  - `convertSQLiteBooleanToJS(value: number): boolean`
  - `convertISOStringToDate(dateStr: string): Date`
  - `createRowTransformer<T>(config: TransformConfig): (row: any) => T`
- **Files using this pattern:**
  - `GuestRepository.ts` lines 38-62
  - `PosterRepository.ts` lines 14-63
  - `ThemeRepository.ts` similar pattern

### Squad B: Connection Management Abstractions

**Task 1.4: Create ConnectionManager Base Class**
- **File to create:** `lib/adapters/BaseConnectionManager.ts`
- **Files to refactor:**
  - `lib/adapters/obs/OBSConnectionManager.ts`
  - `lib/adapters/streamerbot/StreamerbotGateway.ts`
- **Common state to extract:**
  - `reconnectTimer?: NodeJS.Timeout`
  - `reconnectAttempts: number`
  - `maxReconnectAttempts: number`
  - `reconnectDelay: number`
  - `status: ConnectionStatus`
- **Common methods:**
  - `scheduleReconnect()`
  - `connect()`
  - `disconnect()`
  - `getStatus()`
- **Estimated savings:** ~150 lines

**Task 1.5: Consolidate Reconnection Logic**
- **File exists:** `lib/utils/reconnection.ts`
- **Files to update to use it:**
  - `components/presenter/hooks/usePresenterWebSocket.ts` (line 160: hardcoded 3000ms)
  - `components/presenter/hooks/useOverlayState.ts` (lines 141, 147: hardcoded 3000ms)
  - `components/dashboard/cards/GuestsCard.tsx` (lines 105, 112: hardcoded 3000ms)

---

## Iteration 2: Constants & Configuration Centralization (Priority: HIGH)

### Squad C: Constants Consolidation

**Task 2.1: Create UI Timeouts Configuration**
- **File to create:** `lib/config/UITimeouts.ts`
- **Values to centralize:**

```typescript
export const UI_TIMEOUTS = {
  // Toast durations
  TOAST_SHORT: 1500,
  TOAST_MEDIUM: 2000,
  TOAST_LONG: 3000,

  // Debounce intervals
  SEARCH_DEBOUNCE: 300,
  INPUT_DEBOUNCE: 300,

  // Query stale times
  QUERY_STALE_FAST: 5000,
  QUERY_STALE_NORMAL: 30000,
  QUERY_STALE_SLOW: 60000,

  // Polling intervals
  HEALTH_CHECK_INTERVAL: 5000,
  STATUS_POLL_INTERVAL: 5000,

  // Reconnection
  WEBSOCKET_RECONNECT_DELAY: 3000,

  // Animation
  TEXT_APPEAR_DELAY: 1000,
  ERROR_CLEAR_DELAY: 5000,
} as const;
```

- **Files to update:**
  - `app/[locale]/quiz/host/page.tsx` - 12 toast duration values
  - `components/dashboard/DashboardHeader.tsx` - lines 31, 63, 67
  - `components/settings/BackendSettings.tsx` - line 32
  - `components/shell/panels/PresenceStatusPanel.tsx` - line 40
  - `lib/queries/useStreamerbotStatus.ts` - lines 28-29
  - `lib/queries/useProfiles.ts` - line 43
  - `lib/queries/useGuests.ts` - line 57
  - `lib/queries/useOBSStatus.ts` - line 31

**Task 2.2: Create Third-Party API Constants**
- **File to create:** `lib/config/ExternalAPIs.ts`
- **Values to centralize:**

```typescript
export const EXTERNAL_APIS = {
  OLLAMA: {
    DEFAULT_URL: "http://localhost:11434",
  },
  ANTHROPIC: {
    API_URL: "https://api.anthropic.com/v1/messages",
  },
  TWITCH_OAUTH: {
    AUTHORIZE: "https://id.twitch.tv/oauth2/authorize",
    TOKEN: "https://id.twitch.tv/oauth2/token",
    VALIDATE: "https://id.twitch.tv/oauth2/validate",
    REVOKE: "https://id.twitch.tv/oauth2/revoke",
  },
  GITHUB_RELEASES: {
    OBS_WEBSOCKET: "https://api.github.com/repos/obsproject/obs-websocket/releases/latest",
    OBS_MOVE_TRANSITION: "https://api.github.com/repos/exeldro/obs-move-transition/releases/latest",
    OBS_DOWNSTREAM_KEYER: "https://api.github.com/repos/exeldro/obs-downstream-keyer/releases/latest",
  },
} as const;
```

- **Files to update:**
  - `lib/models/TwitchAuth.ts` - lines 40-43
  - `lib/services/llm/AnthropicProvider.ts` - lines 55, 101
  - `lib/services/OllamaSummarizerService.ts` - lines 208, 263
  - `lib/services/llm/LLMProviderFactory.ts` - lines 46, 84
  - `lib/services/updater/RegistryService.ts` - lines 77, 83, 89
  - `app/api/settings/integrations/route.ts` - line 18

**Task 2.3: Consolidate Hardcoded localhost:3000 References**
- **Use APP_URL from `lib/config/urls.ts`**
- **Files to update:**
  - `app/api/twitch/auth/callback/route.ts` - line 110
  - `lib/services/twitch/TwitchOAuthManager.ts` - line 707
  - `streamdeck-plugin/obslive-suite/src/utils/config-manager.ts` - line 24

### Squad D: Validation Limits Centralization

**Task 2.4: Create Validation Limits Configuration**
- **File to create:** `lib/config/ValidationLimits.ts`
- **Values to centralize:**

```typescript
export const VALIDATION_LIMITS = {
  // Field lengths
  NAME_MAX: 100,
  SUBTITLE_MAX: 200,
  DESCRIPTION_MAX: 500,

  // Numeric ranges
  PORT_MIN: 1,
  PORT_MAX: 65535,

  // Buffer sizes
  MAX_MESSAGES_BUFFER: 2000,

  // LLM
  LLM_TEXT_MIN: 50,
  LLM_TEXT_MAX: 10000,

  // Scale
  SCALE_MIN: 0.5,
  SCALE_MAX: 2,

  // Layout percentages
  FREE_TEXT_WIDTH_MIN: 10,
  FREE_TEXT_WIDTH_MAX: 100,
} as const;
```

- **Files to update:**
  - `lib/models/Guest.ts` - lines 8-12
  - `lib/models/Poster.ts` - lines 23, 39, 48
  - `lib/models/Profile.ts` - lines 19-20
  - `lib/models/Theme.ts` - lines 55, 89-91
  - `lib/models/Macro.ts` - lines 34-37
  - `lib/models/LLM.ts` - line 7
  - `lib/models/streamerbot/schemas.ts` - lines 16, 166

---

## Iteration 3: API & Component Patterns (Priority: MEDIUM)

### Squad E: API Route Abstractions

**Task 3.1: Create Express Route Wrapper**
- **File to create:** `server/utils/routeHandler.ts`
- **Pattern to abstract:**

```typescript
export function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>,
  context: string
) {
  return async (req: Request, res: Response) => {
    try {
      await handler(req, res);
    } catch (error) {
      expressError(res, error, `${context} operation failed`, { context });
    }
  };
}
```

- **Files to refactor:**
  - `server/api/quiz.ts` - 30+ endpoints
  - `server/api/cue.ts`
  - `server/api/overlays.ts`
  - `server/api/obs.ts`
  - `server/api/twitch.ts`
- **Estimated savings:** ~150 lines

**Task 3.2: Create Proxy Route Factory**
- **File to create:** `app/api/utils/proxyFactory.ts`
- **Pattern:**

```typescript
export function createSimpleProxy(
  endpoint: string,
  method: "GET" | "POST",
  errorMessage: string,
  logContext: string
) {
  if (method === "GET") {
    return withSimpleErrorHandler(async () => {
      return proxyToBackend(endpoint, { method, errorMessage, logPrefix: logContext });
    }, logContext);
  }
  return withSimpleErrorHandler(async (request: Request) => {
    const body = await request.json();
    return proxyToBackend(endpoint, { method, body, errorMessage, logPrefix: logContext });
  }, logContext);
}
```

- **Files to refactor:**
  - `app/api/overlays/lower/route.ts`
  - `app/api/overlays/countdown/route.ts`
  - `app/api/overlays/poster/route.ts`
  - `app/api/obs/status/route.ts`
  - 10+ similar routes
- **Estimated savings:** ~100 lines

**Task 3.3: Standardize Zod Error Formatting**
- **File to create:** `lib/utils/zodErrorFormatter.ts`
- **Pattern:**

```typescript
export function formatZodError(error: ZodError): {
  error: string;
  details: Record<string, string[]>;
} {
  return {
    error: "Validation failed",
    details: error.flatten().fieldErrors,
  };
}
```

- **Files to update:**
  - `server/api/quiz.ts` - lines 197-204
  - `server/api/twitch.ts` - lines 48-56
  - `app/api/assets/posters/route.ts` - lines 42-46

### Squad F: React Component Abstractions

**Task 3.4: Create VirtualizedGrid<T> Generic Component**
- **File to create:** `components/ui/VirtualizedGrid.tsx`
- **Files to refactor:**
  - `components/assets/VirtualizedGuestGrid.tsx` (156 lines)
  - `components/assets/VirtualizedPosterGrid.tsx` (185 lines)
- **Common logic:**
  - Column count calculation from window width
  - Row grouping algorithm
  - Window resize handler with debouncing
  - Virtual row rendering
  - Empty state handling
- **Estimated savings:** ~150 lines

**Task 3.5: Create EnableSearchCombobox<T> Component**
- **File to create:** `components/ui/EnableSearchCombobox.tsx`
- **Files to refactor:**
  - `components/assets/GuestManager.tsx` - lines 163-234
  - `components/assets/PosterManager.tsx` - lines 384-462
- **Props:**
  - `items: T[]`
  - `searchValue: string`
  - `onSearchChange: (value: string) => void`
  - `itemRenderer: (item: T) => ReactNode`
  - `onSelect: (item: T) => void`
- **Estimated savings:** ~100 lines

**Task 3.6: Create CardActionBar Component**
- **File to create:** `components/ui/CardActionBar.tsx`
- **Files to refactor:**
  - `components/assets/GuestCard.tsx` - lines 78-134
  - `components/assets/PosterCard.tsx` - lines 239-320
- **Estimated savings:** ~80 lines

**Task 3.7: Create EntityHeader Component**
- **File to create:** `components/ui/EntityHeader.tsx`
- **Files to refactor:**
  - `components/assets/GuestManager.tsx` - lines 140-160
  - `components/assets/PosterManager.tsx` - lines 346-381
  - `components/assets/ThemeManager.tsx` - lines 495-530
- **Estimated savings:** ~60 lines

---

## Iteration 4: Service & Settings Patterns (Priority: MEDIUM)

### Squad G: Settings Service Refactoring

**Task 4.1: Create Generic Settings Manager**
- **File to create:** `lib/services/GenericSettingsManager.ts`
- **Pattern:**

```typescript
class SettingAccessor<T> {
  constructor(
    private db: DatabaseService,
    private key: string,
    private defaultValue: T,
    private parser?: (value: string) => T
  ) {}

  get(): T {
    const value = this.db.getSetting(this.key);
    if (value === null) return this.defaultValue;
    return this.parser ? this.parser(value) : value as T;
  }

  set(value: T | null): void {
    if (value === null) {
      this.db.deleteSetting(this.key);
    } else {
      this.db.setSetting(this.key, String(value));
    }
  }
}
```

- **Files to refactor:**
  - `lib/services/SettingsService.ts` - 6 setting groups with 85-95% identical code
- **Estimated savings:** ~200 lines

**Task 4.2: Create JSON Parse Helper**
- **File to create:** `lib/utils/safeJsonParse.ts` (enhance existing)
- **Pattern:**

```typescript
export function safeJsonParse<T>(
  json: string | null,
  defaults: T,
  logger?: Logger,
  context?: string
): T {
  if (!json) return defaults;
  try {
    return JSON.parse(json);
  } catch {
    logger?.warn(`Failed to parse JSON${context ? ` for ${context}` : ""}`);
    return defaults;
  }
}
```

- **Files using this pattern:**
  - `lib/services/SettingsService.ts` - lines 318-323, 379-382, 453-457, 475-479, 541-563

### Squad H: Database Migration Helpers

**Task 4.3: Create Migration Helper Functions**
- **File to create:** `lib/services/database/migrationHelpers.ts`
- **Functions:**

```typescript
export function addColumnIfNotExists(
  db: BetterSqlite3.Database,
  table: string,
  column: string,
  definition: string,
  logger: Logger
): boolean {
  const tableInfo = db.prepare(`PRAGMA table_info(${table})`).all();
  const hasColumn = tableInfo.some((col: any) => col.name === column);
  if (!hasColumn) {
    logger.info(`Adding ${column} column to ${table} table`);
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    return true;
  }
  return false;
}

export function addColumnsIfNotExist(
  db: BetterSqlite3.Database,
  table: string,
  columns: { name: string; definition: string }[],
  logger: Logger
): boolean {
  let anyAdded = false;
  for (const col of columns) {
    if (addColumnIfNotExists(db, table, col.name, col.definition, logger)) {
      anyAdded = true;
    }
  }
  return anyAdded;
}
```

- **Files to refactor:**
  - `lib/services/DatabaseService.ts` - ~15 migrations with 80-90% identical structure
- **Estimated savings:** ~150 lines

### Squad I: Hooks Consolidation

**Task 4.4: Update Presenter Hooks to Use ClientFetch**
- **Files to update:**
  - `components/presenter/hooks/usePresenterWebSocket.ts` - lines 187, 209, 230
  - `components/presenter/hooks/useStreamerbotClient.ts` - lines 81, 107, 142, 156, 275
- **Replace raw `fetch()` with `apiPost()` from `lib/utils/ClientFetch.ts`**

**Task 4.5: Standardize Timeout Management**
- **Files to update:**
  - `components/presenter/hooks/useOverlayState.ts` - lines 76-82
- **Use `useTimeoutMap` hook instead of manual ref management**

---

## Implementation Schedule

| Iteration | Squads | Tasks | Estimated Lines Saved |
|-----------|--------|-------|----------------------|
| 1 | A, B | 1.1-1.5 | ~550 lines |
| 2 | C, D | 2.1-2.4 | ~200 lines (+ consistency) |
| 3 | E, F | 3.1-3.7 | ~540 lines |
| 4 | G, H, I | 4.1-4.5 | ~400 lines |
| **Total** | | **23 tasks** | **~1,690 lines** |

---

## Parallel Execution Strategy

### Phase 1 (Iterations 1-2): Foundation
- **Squad A + Squad B** run in parallel (no dependencies)
- **Squad C + Squad D** run in parallel (no dependencies)
- Squads A/B must complete before E/F/G/H can start

### Phase 2 (Iterations 3-4): Application
- **Squad E + Squad F** run in parallel
- **Squad G + Squad H + Squad I** run in parallel
- All depend on Phase 1 completion

---

## Files Summary

### New Files to Create (12 files)
1. `lib/utils/Singleton.ts`
2. `lib/repositories/BaseRepository.ts`
3. `lib/utils/dbTransformations.ts`
4. `lib/adapters/BaseConnectionManager.ts`
5. `lib/config/UITimeouts.ts`
6. `lib/config/ExternalAPIs.ts`
7. `lib/config/ValidationLimits.ts`
8. `server/utils/routeHandler.ts`
9. `app/api/utils/proxyFactory.ts`
10. `lib/utils/zodErrorFormatter.ts`
11. `components/ui/VirtualizedGrid.tsx`
12. `components/ui/EnableSearchCombobox.tsx`
13. `components/ui/CardActionBar.tsx`
14. `components/ui/EntityHeader.tsx`
15. `lib/services/GenericSettingsManager.ts`
16. `lib/services/database/migrationHelpers.ts`

### Files to Refactor (50+ files)
- All repositories (4)
- All connection managers (2)
- All server/api routes (10+)
- All app/api routes (15+)
- All manager components (3)
- All card components (2)
- All virtualized grids (2)
- SettingsService, DatabaseService
- Various hooks (5+)
- Various query files (4+)

---

## Risk Mitigation

1. **Testing:** Each iteration includes unit test updates
2. **Incremental:** Changes are backward compatible
3. **Rollback:** Git branches per iteration
4. **Verification:** Type checking after each task

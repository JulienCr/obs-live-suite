# Test Coverage Improvement Plan

Multi-session tracking document for incrementally improving test coverage.

## Baseline (15 February 2026)

```
All files   | Stmts 15.21% | Branch 13.55% | Funcs 14.01% | Lines 15.44%
```

**Thresholds** (jest.config.js):
| Metric     | Threshold | Current | Status |
|------------|-----------|---------|--------|
| Statements | 10%       | 15.21%  | PASS   |
| Branches   | 10%       | 13.55%  | PASS   |
| Functions  | 15%       | 14.01%  | FAIL   |
| Lines      | 10%       | 15.44%  | PASS   |

**Test suite status**: 52/53 suites, 917 passed, 33 failed, 8 skipped (958 total)

### File Coverage by Zone

| Zone | Total Files | Tested | Untested | File Coverage |
|------|-------------|--------|----------|---------------|
| lib/services/ | 33 | 11 | 22 | 33% |
| lib/adapters/ | 7 | 0 | 7 | 0% |
| app/api/ (routes) | 97 | 2 | 95 | 2% |
| server/api/ | 10 | 0 | 10 | 0% |
| lib/repositories/ | 12 | 4 | 8 | 33% |
| hooks/ | 16 | 3 | 13 | 19% |
| lib/models/ | 22 | 3 | 19 | 14% |
| lib/utils/ | 27 | 11 | 16 | 41% |
| components/ (non-ui) | 152 | 8 | 144 | 5% |
| **Total** | **376** | **42** | **334** | **11%** |

### Existing Test Infrastructure

- `jest.setup.js` - Global mocks (certificates, env vars, act() warning suppression)
- `__tests__/test-utils/websocket-mock.ts` - `MockWebSocket`, `createWebSocketTestHarness()`
- `__tests__/test-utils/index.ts` - Central export point

---

## Phase 0: Immediate Fixes

**Goal**: All tests pass, `pnpm test:coverage` succeeds (functions >= 15%).

### Broken Tests

- [ ] **ChannelManager.test.ts** (33 failures): Add `setOnAckCallback: jest.fn()` to WebSocketHub mock
  - File: `__tests__/services/ChannelManager.test.ts:26-33`
  - Root cause: `ChannelManager` constructor calls `this.wsHub.setOnAckCallback()` but mock doesn't include it
  - Fix: Add `setOnAckCallback: jest.fn()` inside the `getInstance` mock return value

### Coverage Threshold

- [ ] **Functions threshold**: Currently 14.01% vs 15% threshold
  - Option A: Add tests for a few small untested utility files to push past 15%
  - Option B: Temporarily lower threshold to 14% while Phase 1-2 bring it up
  - Recommended: Option A - test 2-3 small utils (`queryParams.ts`, `dbTransformers.ts`, `urlDetection.ts`)

### Skipped/Warning Cleanup

- [ ] Review 8 skipped tests - re-enable or remove if obsolete
- [ ] Verify overlay renderer tests don't produce act() warnings (currently suppressed globally)

---

## Phase 1: Test Infrastructure

**Goal**: Shared mocks and utilities to unblock efficient test writing.

### Shared Mocks

- [ ] **DatabaseService mock** - In-memory SQLite wrapper for repository/service tests
  - Use `better-sqlite3` with `:memory:` database
  - Auto-run migrations via `MigrationRunner`
  - Expose `reset()` for `beforeEach` cleanup
  - File: `__tests__/test-utils/database-mock.ts`

- [ ] **OBS WebSocket mock** - Mock for `OBSConnectionManager` and related adapters
  - Mock `obs-websocket-js` module
  - Simulate connection states, events, responses
  - File: `__tests__/test-utils/obs-mock.ts`

- [ ] **ChannelManager mock** - Lightweight pub/sub mock for API route tests
  - Track published events, simulate acks
  - File: `__tests__/test-utils/channel-mock.ts`

- [ ] **HTTP request/response mocks** - For Next.js API route testing
  - `createMockNextRequest(method, body, params)` helper
  - `createMockNextResponse()` with json/status capture
  - File: `__tests__/test-utils/api-mock.ts`

### Data Factories

- [ ] **Guest factory** - `createTestGuest(overrides?)`
- [ ] **Poster factory** - `createTestPoster(overrides?)`
- [ ] **Profile factory** - `createTestProfile(overrides?)`
- [ ] **Theme factory** - `createTestTheme(overrides?)`
- [ ] **Quiz question factory** - `createTestQuestion(type, overrides?)`
- [ ] File: `__tests__/test-utils/factories.ts`

### Test Patterns Reference

Document these patterns for consistent test writing:

**Singleton reset** (services):
```typescript
beforeEach(() => {
  (MyService as unknown as { instance: MyService | undefined }).instance = undefined;
});
```

**Module mock** (top-level):
```typescript
jest.mock('@/lib/services/DatabaseService', () => ({
  DatabaseService: { getInstance: jest.fn(() => mockDb) }
}));
```

**WebSocket harness** (overlay/hook tests):
```typescript
const wsMock = createWebSocketTestHarness();
beforeEach(() => wsMock.setup());
afterEach(() => wsMock.cleanup());
```

**AAA pattern** (every test):
```typescript
it('should do X when Y', () => {
  // Arrange
  const input = createTestGuest({ name: 'Test' });
  // Act
  const result = service.process(input);
  // Assert
  expect(result).toEqual(expected);
});
```

---

## Phase 2: Critical Services & Adapters

**Target**: Stmts 30%, Functions 25%

### Services - High Priority (core business logic)

- [ ] `DatabaseService.ts` - Connection, query, migration
- [ ] `SettingsService.ts` - Settings CRUD
- [ ] `SettingsStore.ts` - In-memory settings cache
- [ ] `ThemeService.ts` - Theme CRUD and application
- [ ] `StorageService.ts` - File upload handling
- [ ] `BackupService.ts` - Database backup/restore

### Services - Quiz System (complex state machine)

- [ ] `QuizPhaseManager.ts` - Phase transitions
- [ ] `QuizNavigationManager.ts` - Question navigation
- [ ] `QuizTimer.ts` - Timer tick broadcasts
- [ ] `QuizZoomController.ts` - Auto-zoom for image reveals
- [ ] `QuizMysteryImageController.ts` - Mystery image progression
- [ ] `QuizExamples.ts` - Sample data generation
- [ ] `QuizTypes.ts` - Type definitions (if any logic)

### Services - Integration

- [ ] `SubVideoService.ts` - Sub-video management
- [ ] `WikipediaCacheService.ts` - Wikipedia caching
- [ ] `WikipediaResolverService.ts` - Wikipedia search
- [ ] `OllamaSummarizerService.ts` - LLM summarization
- [ ] `TwitchService.ts` - Twitch API integration
- [ ] `DSKService.ts` - Stream Deck integration

### Services - Infrastructure

- [ ] `ServiceEnsurer.ts` - Service initialization
- [ ] `DatabaseConnector.ts` - Connection management
- [ ] `MigrationRunner.ts` - Schema migrations

### Adapters (0% coverage - all critical)

- [ ] `obs/OBSConnectionManager.ts` - OBS connection lifecycle
- [ ] `obs/OBSStateManager.ts` - State tracking
- [ ] `obs/OBSSceneController.ts` - Scene switching
- [ ] `obs/OBSSourceController.ts` - Source manipulation
- [ ] `obs/OBSEventHandler.ts` - Event processing
- [ ] `obs/OBSConnectionEnsurer.ts` - Connection reliability
- [ ] `streamerbot/StreamerbotGateway.ts` - Streamer.bot client

---

## Phase 3: API Routes & Repositories

**Target**: Stmts 45%, Functions 40%

### Next.js API Routes - Overlays (highest impact)

- [ ] `overlays/lower/route.ts`
- [ ] `overlays/countdown/route.ts`
- [ ] `overlays/poster/route.ts`
- [ ] `overlays/poster-bigpicture/route.ts`
- [ ] `overlays/chat-highlight/route.ts`

### Next.js API Routes - Assets

- [ ] `assets/guests/route.ts` (GET, POST)
- [ ] `assets/guests/[id]/route.ts` (GET, PUT, DELETE)
- [ ] `assets/guests/upload/route.ts`
- [ ] `assets/posters/route.ts` (GET, POST)
- [ ] `assets/posters/[id]/route.ts` (GET, PUT, DELETE)
- [ ] `assets/posters/[id]/chapters/route.ts`
- [ ] `assets/posters/[id]/subvideos/route.ts`
- [ ] `assets/posters/bulk/route.ts`
- [ ] `assets/tags/route.ts`
- [ ] `assets/text-presets/route.ts`
- [ ] `assets/text-presets/[id]/route.ts`
- [ ] `assets/upload/route.ts`
- [ ] `assets/thumbnail/route.ts`
- [ ] `assets/quiz/route.ts`
- [ ] `assets/download-upload/route.ts`

### Next.js API Routes - Quiz

- [ ] `quiz/questions/route.ts`
- [ ] `quiz/questions/[id]/route.ts`
- [ ] `quiz/questions/bulk/route.ts`
- [ ] `quiz/session/create/route.ts`
- [ ] `quiz/state/route.ts`

### Next.js API Routes - OBS

- [ ] `obs/status/route.ts`
- [ ] `obs/reconnect/route.ts`
- [ ] `obs/record/route.ts`
- [ ] `obs/stream/route.ts`

### Next.js API Routes - Settings & Profiles

- [ ] `settings/general/route.ts`
- [ ] `settings/obs/route.ts`
- [ ] `settings/paths/route.ts`
- [ ] `settings/integrations/route.ts`
- [ ] `settings/overlay/route.ts`
- [ ] `settings/twitch/route.ts`
- [ ] `settings/open-folder/route.ts`
- [ ] `profiles/route.ts`
- [ ] `profiles/[id]/route.ts`
- [ ] `profiles/[id]/activate/route.ts`

### Next.js API Routes - Presenter

- [ ] `presenter/cue/send/route.ts`
- [ ] `presenter/cue/clear/route.ts`
- [ ] `presenter/cue/[messageId]/action/route.ts`
- [ ] `presenter/settings/route.ts`

### Next.js API Routes - Actions (Stream Deck)

- [ ] `actions/lower/show/route.ts`
- [ ] `actions/lower/hide/route.ts`
- [ ] `actions/lower/guest/[id]/route.ts`
- [ ] `actions/lower/text-preset/[id]/route.ts`
- [ ] `actions/countdown/start/route.ts`
- [ ] `actions/poster/show/[id]/route.ts`
- [ ] `actions/poster/hide/route.ts`
- [ ] `actions/poster/next/route.ts`
- [ ] `actions/poster/previous/route.ts`
- [ ] `actions/macro/route.ts`
- [ ] `actions/panic/route.ts`

### Next.js API Routes - Other

- [ ] `themes/route.ts`
- [ ] `themes/[id]/route.ts`
- [ ] `panel-colors/route.ts`
- [ ] `panel-colors/[panelId]/route.ts`
- [ ] `workspaces/route.ts`
- [ ] `workspaces/[id]/route.ts`
- [ ] `workspaces/[id]/default/route.ts`
- [ ] `init/route.ts`
- [ ] `debug/websocket/route.ts`
- [ ] `test/lower-third/route.ts`
- [ ] `utils/metadata/route.ts`
- [ ] `youtube/metadata/route.ts`

### Next.js API Routes - Wikipedia & LLM

- [ ] `wikipedia/search/route.ts`
- [ ] `wikipedia/resolve/route.ts`
- [ ] `wikipedia/summarize/route.ts`
- [ ] `wikipedia/cache/route.ts`
- [ ] `llm/models/route.ts`
- [ ] `llm/summarize/route.ts`
- [ ] `llm/test/route.ts`
- [ ] `ollama/test/route.ts`

### Next.js API Routes - Twitch

- [ ] `twitch/auth/start/route.ts`
- [ ] `twitch/auth/callback/route.ts`
- [ ] `twitch/auth/disconnect/route.ts`
- [ ] `twitch/auth/reload/route.ts`
- [ ] `twitch/status/route.ts`
- [ ] `twitch/refresh/route.ts`
- [ ] `twitch/update/route.ts`
- [ ] `twitch/categories/route.ts`
- [ ] `twitch/provider/route.ts`
- [ ] `twitch/polling/start/route.ts`
- [ ] `twitch/polling/stop/route.ts`
- [ ] `twitch/moderation/ban/route.ts`
- [ ] `twitch/moderation/timeout/route.ts`
- [ ] `twitch/moderation/message/route.ts`

### Next.js API Routes - Updater

- [ ] `updater/plugins/route.ts`
- [ ] `updater/scan/route.ts`

### Backend Express Routes (0% coverage)

- [ ] `server/api/overlays.ts`
- [ ] `server/api/obs.ts`
- [ ] `server/api/obs-helpers.ts`
- [ ] `server/api/quiz.ts`
- [ ] `server/api/quiz-bot.ts`
- [ ] `server/api/cue.ts`
- [ ] `server/api/streamerbot-chat.ts`
- [ ] `server/api/chat-messages.ts`
- [ ] `server/api/presenter-settings.ts`
- [ ] `server/api/twitch.ts`

### Repositories (untested)

- [ ] `BaseRepository.ts` - Base class with shared query methods
- [ ] `SingletonRepository.ts` - Singleton pattern base
- [ ] `ChatMessageRepository.ts`
- [ ] `PanelColorRepository.ts`
- [ ] `SettingsRepository.ts`
- [ ] `TextPresetRepository.ts`
- [ ] `ThemeRepository.ts`
- [ ] `WorkspaceRepository.ts`

---

## Phase 4: Hooks, Models & Utils

**Target**: Stmts 55%, Functions 50%

### Hooks - WebSocket (complex async logic)

- [ ] `useWebSocketChannel.ts` - Core WebSocket subscription hook
- [ ] `useMultiChannelWebSocket.ts` - Multi-channel variant
- [ ] `useEventLog.ts` - Event log management
- [ ] `useOverlayActiveState.ts` - Overlay visibility state
- [ ] `useSyncWithOverlayState.ts` - Dashboard-overlay sync
- [ ] `useChatHighlightSync.ts` - Chat highlight sync

### Hooks - Poster

- [ ] `poster/usePosterPlayback.ts` - Video/YouTube playback management
- [ ] `poster/useChapterNavigation.ts` - Chapter navigation
- [ ] `poster/useSubVideoPlayback.ts` - Sub-video playback
- [ ] `poster/posterEventHandlers.ts` - Event handler utilities

### Hooks - Other

- [ ] `use-pwa-standalone.ts` - PWA detection
- [ ] `use-toast.ts` - Toast notifications (likely thin wrapper)

### Models (Zod schemas - high value, easy to test)

- [ ] `OverlayEvents.ts` - Overlay event schemas
- [ ] `Database.ts` - Core database schemas
- [ ] `Theme.ts` - Theme configuration schemas
- [ ] `Quiz.ts` - Question, round, session schemas
- [ ] `QuizEvents.ts` - Quiz WebSocket event types
- [ ] `Poster.ts` - Poster schemas
- [ ] `Profile.ts` - Profile schemas
- [ ] `Cue.ts` - Cue message schemas
- [ ] `ChatMessages.ts` - Chat message schemas
- [ ] `StreamerbotChat.ts` - Streamer.bot chat schemas
- [ ] `PresenterChannel.ts` - Presenter channel schemas
- [ ] `Plugin.ts` - Plugin schemas
- [ ] `PanelColor.ts` - Panel color schemas
- [ ] `EventLog.ts` - Event log schemas
- [ ] `LLM.ts` - LLM schemas
- [ ] `Widget.ts` - Widget schemas
- [ ] `Twitch.ts` - Twitch schemas
- [ ] `TwitchAuth.ts` - Twitch auth schemas
- [ ] `Wikipedia.ts` - Wikipedia schemas

### Utils (untested)

- [ ] `urlDetection.ts` - URL type detection (YouTube, Twitch, etc.)
- [ ] `dbTransformers.ts` - Database value transformers
- [ ] `queryParams.ts` - Query parameter utilities
- [ ] `CsvParser.ts` - CSV parsing
- [ ] `ClientFetch.ts` - Client-side fetch wrapper
- [ ] `BackendClient.ts` - Backend HTTP client
- [ ] `themeEnrichment.ts` - Theme processing
- [ ] `fontLoader.ts` - Font loading utilities
- [ ] `fileUpload.ts` - File upload helpers
- [ ] `pkce.ts` - PKCE auth flow
- [ ] `presenterNotifications.ts` - Presenter notification utilities
- [ ] `questionTypeColors.ts` - Quiz question type colors
- [ ] `websocket.ts` - WebSocket utilities
- [ ] `widgetStorage.ts` - Widget storage helpers
- [ ] `ApiResponses.ts` - API response helpers
- [ ] `CertificateManager.ts` - HTTPS certificate management
- [ ] `ConnectionManager.ts` - Generic connection management

---

## Phase 5: UI Components

**Target**: Stmts 65%, Functions 60%

### Overlay Renderers (8 tested, high priority for remaining)

- [ ] `overlays/ChatHighlightRenderer.tsx`
- [ ] `overlays/QuizRenderer.tsx`
- [ ] `overlays/PosterDisplay.tsx`

### Dashboard Cards

- [ ] `dashboard/cards/LowerThirdCard.tsx`
- [ ] `dashboard/cards/CountdownCard.tsx`
- [ ] `dashboard/cards/PosterCard.tsx`
- [ ] `dashboard/cards/QuizCard.tsx`
- [ ] `dashboard/cards/ChatHighlightCard.tsx`
- [ ] `dashboard/cards/EventLogCard.tsx`
- [ ] `dashboard/cards/OBSCard.tsx`

### Quiz Components

- [ ] `quiz/host/QuizHostPanel.tsx`
- [ ] `quiz/host/QuizScoreboard.tsx`
- [ ] `quiz/host/QuizQuestionDisplay.tsx`
- [ ] `quiz/manage/QuestionEditor.tsx`
- [ ] `quiz/manage/QuestionList.tsx`

### Asset Components

- [ ] `assets/GuestManager.tsx`
- [ ] `assets/GuestCard.tsx`
- [ ] `assets/PosterManager.tsx`
- [ ] `assets/PosterCard.tsx`
- [ ] `assets/ThemeManager.tsx`

### Settings Components

- [ ] `settings/GeneralSettings.tsx`
- [ ] `settings/OBSSettings.tsx`
- [ ] `settings/PathSettings.tsx`
- [ ] `settings/PluginSettings.tsx`
- [ ] `settings/RoomSettings.tsx`
- [ ] `settings/IntegrationSettings.tsx`

### Shell Components

- [ ] `shell/AppShell.tsx`
- [ ] `shell/DashboardShell.tsx`
- [ ] `shell/CommandPalette.tsx`

### Presenter Components

- [ ] `presenter/PresenterShell.tsx`
- [ ] `presenter/CueCard.tsx`

### Theme Editor

- [ ] `theme-editor/ThemeEditor.tsx`
- [ ] `theme-editor/ThemeList.tsx`
- [ ] `theme-editor/ThemeCard.tsx`

### Profile Components

- [ ] `profiles/ProfileManager.tsx`

---

## Coverage Targets Summary

| Phase | Stmts Target | Functions Target | Key Focus |
|-------|-------------|-----------------|-----------|
| 0     | 15% (fix)   | 15% (fix)       | Fix broken tests, pass CI |
| 1     | 15%         | 15%             | Infrastructure only (no coverage gain) |
| 2     | 30%         | 25%             | Services & adapters |
| 3     | 45%         | 40%             | API routes & repositories |
| 4     | 55%         | 50%             | Hooks, models, utils |
| 5     | 65%         | 60%             | UI components |

### Threshold Progression

Update `jest.config.js` thresholds as each phase completes:

| Phase | statements | branches | functions | lines |
|-------|-----------|----------|-----------|-------|
| 0     | 10        | 10       | 14        | 10    |
| 2     | 25        | 20       | 22        | 25    |
| 3     | 40        | 30       | 35        | 40    |
| 4     | 50        | 40       | 45        | 50    |
| 5     | 60        | 50       | 55        | 60    |

---

## Verification Commands

```bash
# Run all tests
pnpm test

# Run with coverage report
pnpm test:coverage

# Run specific test file
pnpm test -- __tests__/services/ChannelManager.test.ts

# Run tests matching pattern
pnpm test -- --testPathPattern="services"

# Run with verbose output
pnpm test -- --verbose

# Check coverage for specific files
pnpm test -- --coverage --collectCoverageFrom='lib/services/**/*.ts'
```

---

## Notes

- Coverage collection is configured for `lib/**/*.ts`, `components/**/*.tsx`, `app/**/*.tsx` only
- `server/api/` and `hooks/` files contribute to coverage only if imported by tested code
- Zod model files are high-value targets: easy to test, high statement/branch counts
- API route tests require `createMockNextRequest` pattern (see Phase 1 infrastructure)
- OBS adapter tests should mock `obs-websocket-js` at module level

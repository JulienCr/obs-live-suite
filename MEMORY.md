# OBS Live Suite - Project Memory

## Project Context
- **Started**: 2025-10-20
- **Goal**: Build a comprehensive OBS live-show control suite with overlays, Stream Deck integration, and plugin updater
- **Stack**: Next.js 14+ (App Router), TypeScript, Tailwind CSS, shadcn/ui, pm2
- **Node Version**: 20+
- **Package Manager**: pnpm

## Key Decisions
1. **No Electron**: User wants to move away from Electron due to weight. Using pm2 for process management. Tauri may be considered later for UI.
2. **Fresh Implementation**: Starting from scratch, not reusing code from previous obs-tools project.
3. **Full Feature Set**: Implementing all features from v0.1 to v1.0 roadmap in one go.
4. **Modular Architecture**: Strict adherence to single responsibility, files under 500 lines (target 100-150), Manager/Coordinator patterns.

## Architectural Patterns
- **Managers**: Business logic (ProfileManager, SettingsManager, etc.)
- **Services**: Core functionality (DatabaseService, WebSocketHub, etc.)
- **Adapters**: External integrations (OBSConnectionManager, etc.)
- **Controllers**: Specific control operations (OBSSceneController, etc.)

## Technical Constraints
- Files must not exceed 500 lines (strict limit)
- Target file size: 100-150 lines
- Use JSDoc for all documentation
- Every functionality in dedicated class/struct
- Favor composition over inheritance

## Implementation Summary

### Phases Completed
Created a comprehensive OBS Live Suite with:
1. **Full-stack Next.js application** with TypeScript, Tailwind, shadcn/ui
2. **7 data models** with Zod validation (Guest, Poster, Theme, Macro, Preset, Profile, Plugin)
3. **OBS integration** with connection manager, state tracking, scene/source controllers
4. **Real-time WebSocket system** for overlay communication (port 3001)
5. **3 overlay renderers** with CSS animations (lower third, countdown, poster)
6. **Dashboard UI** with control cards, macros bar, event log
7. **Stream Deck HTTP API** with 8+ action endpoints
8. **Plugin updater** with filesystem scanner, GitHub release checker, registry system
9. **Macro engine** for automated action sequences
10. **Server initialization** with singleton services and proper shutdown
11. **Complete documentation** (README, ARCHITECTURE, STREAM-DECK-SETUP)

### File Structure (120+ files created)
- `app/` - Pages and API routes (dashboard, overlays, updater, 20+ API endpoints)
- `lib/` - Models, services, adapters, config (all modular, under 150 lines each)
- `components/` - UI components (dashboard cards, overlay renderers, shadcn/ui)
- `docs/` - Architecture diagrams and setup guides

### Key Technologies Integrated
- Next.js 14 (App Router) + TypeScript
- obs-websocket-js v5 for OBS integration
- ws for WebSocket server
- better-sqlite3 for database
- Zod for validation
- Tailwind + shadcn/ui for styling
- PM2 for process management

## Mistakes & Dead-ends

### None Encountered
Implementation proceeded smoothly following the established architecture patterns. All singleton services, modular design, and file size constraints were respected throughout.


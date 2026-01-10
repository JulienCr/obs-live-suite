# OBS Live Suite

A comprehensive desktop-first web application for managing live show production with real-time overlays, OBS integration, Stream Deck support, interactive quizzes, and presenter communication tools.

## Features

### Core Overlays
- **Lower Thirds**: Customizable guest/topic overlays with multiple templates (Classic, Bar, Card, Slide)
- **Countdown Timers**: Multiple styles (Bold center, Corner, Banner top)
- **Theatre Posters**: Draggable masonry grid with BigPicture variant
- **Chat Highlight**: Display highlighted chat messages as overlay
- **Composite Overlay**: Combined multi-element overlay
- **Quiz Overlay**: Interactive quiz display with timer, vote bars, player avatars

### Theme Customization
- Live preview theme editor with interactive 16:9 canvas
- Drag-and-drop positioning with pixel coordinates
- Colors, fonts, templates, scale controls
- 5 pre-built themes included
- Undo/Redo with Ctrl+Z / Ctrl+Y

### Real-Time Dashboard
- Dockview-based panel layout with persistence
- Widget system with customizable panels
- Event log with acknowledgment tracking
- Macro automation system

### Quiz System
- 5 question types: QCM, Image, Closest, Open, Image Zoom-Buzz
- 4 on-set players + Twitch viewer participation
- Streamer.bot integration for chat commands (!a, !b, !c, !d, !n, !rep)
- Real-time scoring and leaderboards
- Host control panel with round/question/timer management

### Presenter Interface
- Private presenter dashboard with Dockview panels
- VDO.Ninja iframe integration for return video
- Private cue system (info/warn/urgent/countdown/question/context)
- Quick reply buttons and acknowledgment tracking
- Multi-room support for presenter ↔ control room communication

### Streamer.bot Chat Panel
- Local chat display via @streamerbot/client WebSocket
- Zero iframe dependency, works in OBS docks
- Auto-reconnect, keyword highlighting, role badges
- Virtualized list for high-volume chat

### Stream Deck Integration
- Native plugin with dynamic dropdowns and live countdown display
- 9+ pre-configured actions (lower third, countdown, poster, quiz, panic)
- HTTP API fallback for simple integration

### Additional Features
- **i18n**: French (default) and English support (~83% translated)
- **Wikipedia Integration**: Auto-fetch guest information and summaries
- **LLM/Ollama Integration**: AI-powered content summarization
- **PWA Support**: Standalone mobile mode
- **OBS Extensions Updater**: Plugin/script version management
- **Profiles**: Save and load complete show setups
- **Backup System**: Automated database backups
- **Panic Button**: Emergency hide all overlays

## Requirements

- Node.js 20+ (recommended: 20.x LTS)
- pnpm
- OBS Studio with obs-websocket v5

## Setup

1. Install dependencies:
```bash
pnpm install
```

2. Create `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Configure OBS WebSocket credentials in `.env`

4. Ensure OBS Studio is running with WebSocket server enabled:
   - Open OBS Studio
   - Go to Tools → WebSocket Server Settings
   - Enable the WebSocket server
   - Note the port (default: 4455) and password

5. Run development server:
```bash
pnpm dev
```

The server will automatically:
- Initialize the database
- Start the WebSocket hub (port 3003)
- Start the backend API (port 3002)
- Connect to OBS (with automatic retries)

6. Open browser at `http://localhost:3000`

## Development Commands

### Core Commands
```bash
pnpm dev              # Start frontend + backend (watch mode)
pnpm dev:frontend     # Start only Next.js dev server
pnpm dev:backend      # Start only backend server
pnpm build            # Build for production
pnpm start            # Start production server
```

### Testing
```bash
pnpm test             # Run unit tests (Jest)
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Generate coverage report
pnpm test:functional  # Run functional overlay tests
pnpm test:functional:ui  # Run dashboard UI tests
pnpm test:all         # Run all tests
```

### Code Quality
```bash
pnpm lint             # Run ESLint
pnpm type-check       # TypeScript validation
```

### PM2 Production
```bash
pnpm pm2:start        # Start with PM2
pnpm pm2:stop         # Stop PM2 processes
pnpm pm2:restart      # Restart PM2
pnpm pm2:logs         # View logs
pnpm pm2:status       # Check status
```

### Utilities
```bash
pnpm streamdeck:ids   # List Stream Deck action IDs
pnpm backup:appdata   # Backup application data
pnpm setup:https      # Generate HTTPS certificates
```

## OBS Browser Sources

Add these as Browser Sources in OBS (1920x1080, check "Shutdown source when not visible"):

| Overlay | URL |
|---------|-----|
| Lower Third | `http://localhost:3000/overlays/lower-third` |
| Countdown | `http://localhost:3000/overlays/countdown` |
| Poster | `http://localhost:3000/overlays/poster` |
| Poster BigPicture | `http://localhost:3000/overlays/poster-bigpicture` |
| Quiz | `http://localhost:3000/overlays/quiz` |
| Chat Highlight | `http://localhost:3000/overlays/chat-highlight` |
| Composite | `http://localhost:3000/overlays/composite` |

## Application Routes

### Main Interface
| Route | Description |
|-------|-------------|
| `/dashboard` | Main control dashboard |
| `/presenter` | Presenter view (VDO.Ninja + cues) |
| `/assets` | Guest/poster/theme management |
| `/profiles` | Profile management |
| `/settings` | Application settings |
| `/quiz/host` | Quiz host control panel |
| `/quiz/manage` | Quiz question editor |
| `/updater` | OBS plugin updater |

### Special Routes
| Route | Description |
|-------|-------------|
| `/cert` | Mobile certificate installation |
| `/shortcuts` | Keyboard shortcuts reference |

## Theming System

Customize overlay appearance and positioning:

1. Navigate to **Assets** → **Themes**
2. Click **New Theme** or edit existing
3. Use the **interactive 16:9 canvas preview**:
   - Drag overlays to position
   - +/- buttons to scale (50%-200%)
   - Real-time preview updates
   - Grid lines and center guides

**5 Pre-built Themes:**
- Modern Blue (Classic + Bold)
- Vibrant Purple (Bar + Corner)
- Elegant Red (Card + Banner)
- Clean Green (Slide + Bold)
- Dark Mode (Classic + Corner)

## Quiz System

### Host Panel
URL: `http://localhost:3000/quiz/host`

Controls: Round (Start/End), Question (Show/Lock/Reveal/Next), Timer (+10s/Resume/Stop), Buzzer (Hit/Lock/Release), Zoom (Start/Stop/Step)

### Question Types
- **QCM**: Multiple choice with !a !b !c !d commands
- **Image QCM**: Image-based multiple choice
- **Closest**: Numeric guess with !n command
- **Open**: Free text with !rep command
- **Image Zoom-Buzz**: Progressive reveal with buzzer

### Streamer.bot Setup
Configure webhook to POST to `http://localhost:3002/api/quiz-bot/chat` with:
```json
{
  "userId": "%userId%",
  "displayName": "%user%",
  "message": "%rawInput%"
}
```

## Presenter Interface

### Panels
- **VDO.Ninja**: Return video iframe with mute/refresh controls
- **Cue Feed**: Private messages from control room
- **Quick Reply**: Configurable response buttons
- **Streamerbot Chat**: Live chat display

### Cue Types
- `cue` (info/warn/urgent)
- `countdown` (timing)
- `question` (promoted from chat)
- `context` (image + bullets + links)
- `note` (freeform)

## Stream Deck Integration

### Native Plugin (Recommended)
- Location: `streamdeck-plugin/obslive-suite/`
- Setup Guide: [Stream Deck Setup](./docs/STREAM-DECK-SETUP.md)
- Plugin Documentation: [Stream Deck Plugin](./docs/STREAM-DECK-PLUGIN.md)

### HTTP API (Alternative)
Use Stream Deck's "Website" action with endpoints at `http://localhost:3002/api/`

## Production Deployment

1. Build the application:
```bash
pnpm build
```

2. Start with PM2:
```bash
pnpm pm2:start
```

## Architecture

- **Framework**: Next.js 15+ (App Router)
- **UI**: Tailwind CSS + shadcn/ui + Dockview
- **i18n**: next-intl (FR/EN)
- **OBS Integration**: obs-websocket-js v5
- **Real-time**: WebSocket (ws) on port 3003
- **Backend**: Express on port 3002
- **Database**: SQLite (better-sqlite3)
- **Process Manager**: PM2

### Dual-Process Design
- **Frontend** (port 3000): Next.js UI, API routes
- **Backend** (port 3002): Express API, WebSocket hub (3003)

The backend runs independently to maintain WebSocket/OBS connections during hot-reload.

## Troubleshooting

### OBS WebSocket Connection Failed
- Ensure OBS Studio is running
- Check Tools > WebSocket Server Settings in OBS
- Verify port (default: 4455) and password in `.env`

### Port Already in Use
- Check for existing processes: `netstat -ano | findstr :3000` (Windows)
- Kill the process or change port in `.env`

### Overlays Not Updating
- Check browser console for WebSocket errors
- Verify overlays are added as Browser Sources in OBS
- Check WebSocket hub status at port 3003

### Mobile/HTTPS Issues
- Visit `/cert` route to download and install certificate
- Use `pnpm setup:https` to generate certificates

## Documentation

- [Architecture](./docs/ARCHITECTURE.md)
- [Stream Deck Setup](./docs/STREAM-DECK-SETUP.md)
- [Stream Deck Plugin](./docs/STREAM-DECK-PLUGIN.md)
- [Quiz System](./docs/QUIZ-SYSTEM.md)
- [Presenter Interface PRD](./docs/prd-presenter-interface.md)
- [Streamerbot Chat PRD](./docs/PRD-STREAMERBOT-CHAT.md)
- [VDO.Ninja Setup](./docs/VDONINJA-SETUP.md)
- [i18n Status](./docs/I18N-TRANSLATION-STATUS.md)

## License

MIT

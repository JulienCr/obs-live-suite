# OBS Live Suite

A desktop-first web application for managing live show overlays, Stream Deck integration, and OBS plugin updates.

## Features

- **Overlay Control Suite**: Lower thirds, countdown timers, theatre posters
- **Real-Time Dashboard**: One-page control surface with hot presets
- **Stream Deck Integration**: HTTP API for button mapping
- **OBS Extensions Updater**: Plugin/script version management
- **Profiles**: Save and load complete show setups
- **Macro System**: Automated action sequences

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
- Start the WebSocket hub
- Connect to OBS (with automatic retries if OBS isn't running yet)

6. Open browser at `http://localhost:3000`

7. Add overlay Browser Sources in OBS:
   - Lower Third: `http://localhost:3000/overlays/lower-third`
   - Countdown: `http://localhost:3000/overlays/countdown`
   - Poster: `http://localhost:3000/overlays/poster`
   - Set size: 1920x1080, check "Shutdown source when not visible"

## Production Deployment

1. Build the application:
```bash
pnpm build
```

2. Start with PM2:
```bash
pnpm start:prod
```

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
- Ensure URLs point to correct localhost address

## Architecture

- **Framework**: Next.js 14+ (App Router)
- **UI**: Tailwind CSS + shadcn/ui
- **OBS Integration**: obs-websocket-js v5
- **Real-time**: WebSocket (ws)
- **Database**: better-sqlite3
- **Process Manager**: PM2

## Documentation

- [API Documentation](./docs/API.md)
- [Architecture](./docs/ARCHITECTURE.md)
- [Stream Deck Setup](./docs/STREAM-DECK-SETUP.md)
- [Plugin Registry](./docs/PLUGIN-REGISTRY.md)

## License

MIT


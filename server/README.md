# Backend Server

## Architecture

This directory contains the **standalone backend server** that runs independently from Next.js.

### Why Separate Backend?

In Next.js development mode, the framework uses **multiple worker processes** for Hot Module Replacement (HMR). This causes issues with singleton services like:
- WebSocket servers (port conflicts)
- OBS connections (multiple connection attempts)
- Database connections

The solution: Run stateful services in a **separate Node.js process**.

```
┌─────────────────┐         ┌──────────────────┐
│   Next.js UI    │ ──HTTP─→│  Backend Server  │
│   (Port 3000)   │         │   (Port 3002)    │
└─────────────────┘         └──────────────────┘
                                     │
                                     ├─ WebSocket (Port 3003)
                                     ├─ OBS Connection
                                     └─ Database

       Browser ─────WebSocket──────→ Port 3003
```

## Running

### Development (Recommended)
```bash
# Starts both backend and frontend together
pnpm dev
```

### Manual (Separate terminals)
```bash
# Terminal 1: Backend
pnpm run backend

# Terminal 2: Frontend
pnpm run dev:frontend
```

## API Endpoints

### `GET /health`
Health check

**Response:**
```json
{
  "status": "ok",
  "wsRunning": true,
  "obsConnected": true,
  "timestamp": 1234567890
}
```

### `POST /publish`
Publish message to WebSocket channel

**Body:**
```json
{
  "channel": "lower",
  "type": "show",
  "payload": { "title": "Example", "subtitle": "Test" }
}
```

### `GET /ws/stats`
Get WebSocket statistics

**Response:**
```json
{
  "isRunning": true,
  "clients": 3,
  "channels": {
    "lower": 1,
    "countdown": 1,
    "poster": 1
  }
}
```

## Production

In production mode, Next.js uses a single process, so the backend can run within `instrumentation.ts`. However, running as a separate service is still recommended for:
- Better resource isolation
- Independent scaling
- Cleaner architecture

Update `ecosystem.config.cjs` for PM2 deployment with both processes.


# Quiz System - Complete Guide

## Overview

The Quiz System adds interactive quiz functionality to OBS Live Suite with support for:
- 4 on-set players (from existing guests database)
- Twitch viewers via chat commands
- Multiple question types: QCM, Image, Closest, Open, Image Zoom-Buzz
- Real-time scoring and leaderboards
- Streamer.bot integration for chat parsing

## Access Points

### Host Panel
**URL**: `http://localhost:3000/quiz/host`

Control interface with buttons for:
- **Round**: Start Round, End Round
- **Question**: Show, Lock, Reveal, Next
- **Zoom**: Start, Stop, Step +/-, (for image reveal modes)
- **Buzzer**: Hit, Lock, Release (for on-set players)
- **Timer**: +10s, Resume, Stop
- **Session**: Load Example Questions, Reset Session

### Overlay (OBS Browser Source)
**URL**: `http://localhost:3000/overlays/quiz`

Settings:
- Width: 1920
- Height: 1080
- Custom CSS: (none needed)
- Shutdown source when not visible: ✓ (recommended)

Displays:
- Timer (top-right)
- QCM vote bars (bottom-center)
- Player avatars (bottom row)

## Question Types

### 1. QCM (Multiple Choice)
```typescript
{
  type: "qcm",
  text: "What is the capital of France?",
  options: ["London", "Paris", "Berlin", "Madrid"],
  correct: 1, // Index of correct option
  points: 10,
  time_s: 20
}
```
**Chat**: `!a`, `!b`, `!c`, `!d`

### 2. Image QCM
```typescript
{
  type: "image",
  mode: "image_qcm",
  text: "What animal is shown?",
  media: "https://example.com/image.jpg",
  options: ["Cat", "Dog", "Bird", "Fish"],
  correct: 1,
  points: 15,
  time_s: 25
}
```
**Chat**: `!a`, `!b`, `!c`, `!d`

### 3. Closest Number
```typescript
{
  type: "closest",
  text: "How many countries in the EU?",
  correct: 27, // Target value
  points: 20,
  time_s: 30
}
```
**Chat**: `!n 27`
**Scoring**: `score = max(points - k * |target - answer|, 0)`

### 4. Open Answer
```typescript
{
  type: "open",
  text: "Name a programming language",
  points: 10,
  time_s: 30
}
```
**Chat**: `!rep Python`
**Scoring**: Host manually assigns 0-10 points

### 5. Image Zoom-Buzz
```typescript
{
  type: "image",
  mode: "image_zoombuzz",
  text: "Identify this landmark",
  media: "https://example.com/mystery.jpg",
  correct: "Eiffel Tower",
  points: 25,
  time_s: 45,
  zoom: {
    auto: true,
    interval_ms: 300,
    steps: 20,
    effect: "scale"
  },
  buzz: {
    timeout_ms: 8000,
    lock_ms: 300,
    steal: false
  }
}
```
Image progressively de-zooms; first buzzer gets exclusive answer window.

## Streamer.bot Integration

### Webhook Setup

1. In Streamer.bot, create a new Action
2. Add Sub-Action: "Core" → "Network" → "Fetch URL"
3. Configure:
   - Method: `POST`
   - URL: `http://localhost:3002/api/quiz-bot/chat`
   - Headers: `Content-Type: application/json`
   - Body:
   ```json
   {
     "userId": "%userId%",
     "displayName": "%user%",
     "message": "%rawInput%"
   }
   ```
4. Trigger: Chat Message with regex `^!([a-d]|n\s+\d+|rep\s+.+)$`

### Supported Commands

| Command | Format | Purpose |
|---------|--------|---------|
| `!a` `!b` `!c` `!d` | `!a` | Vote for QCM option |
| `!n` | `!n 42` | Submit closest number |
| `!rep` | `!rep answer text` | Submit open answer |

### Flood Control

- Per-user cooldown: 1500ms
- Max attempts per user: 5
- Global RPS: 50/sec
- First or last wins: configurable (default: last)

## State Machine

```
idle
 ↓
show_question (timer starts)
 ↓
accept_answers (viewers can vote)
 ↓
lock (voting closed)
 ↓
reveal (show correct answer)
 ↓
score_update
 ↓
interstitial
 ↓
next_question → (loop)
```

## Backend API Endpoints

All endpoints are on `http://localhost:3002/api/quiz`

### Round Control
- `POST /round/start` - `{ roundIndex: 0 }`
- `POST /round/end`

### Question Control
- `POST /question/show`
- `POST /question/lock`
- `POST /question/reveal`
- `POST /question/next`

### Zoom Control
- `POST /media/zoom/start`
- `POST /media/zoom/stop`
- `POST /media/zoom/step` - `{ delta: 1 }`

### Buzzer Control
- `POST /buzzer/hit` - `{ playerId: "..." }`
- `POST /buzzer/lock`
- `POST /buzzer/release`

### Timer Control
- `POST /timer/add` - `{ delta: 10 }`
- `POST /timer/resume`
- `POST /timer/stop`

### Session Management
- `GET /state` - Get current phase and session
- `POST /config` - Update quiz config
- `POST /session/save` - Save to JSON
- `POST /session/load` - `{ id: "session-id" }`
- `POST /session/reset` - Create new session
- `POST /session/load-example` - Load example questions

### Scoring
- `POST /score/update` - `{ target: "player", id: "player-1", delta: 10 }`

## File Structure

```
lib/
  models/
    Quiz.ts               # Question, Round, Session schemas
    QuizEvents.ts         # WebSocket event types
  services/
    QuizManager.ts        # State machine orchestration
    QuizStore.ts          # In-memory + JSON persistence
    QuizScoringService.ts # Scoring algorithms
    QuizBuzzerService.ts  # First-hit/steal mechanics
    QuizViewerInputService.ts # Flood control
    QuizZoomController.ts # Auto-zoom for images
    QuizTimer.ts          # Tick broadcasts
    QuizExamples.ts       # Sample questions

server/api/
  quiz.ts               # Main quiz API
  quiz-bot.ts           # Streamer.bot webhook bridge

app/
  quiz/host/page.tsx    # Host control panel
  overlays/quiz/page.tsx # OBS overlay

components/quiz/
  QuizRenderer.tsx      # Main WS subscriber
  QuizQcmDisplay.tsx    # Vote bars
  QuizTimerDisplay.tsx  # Timer overlay
  QuizPlayersDisplay.tsx # Player avatars

__tests__/
  services/
    QuizScoringService.test.ts
    QuizBuzzerService.test.ts
    QuizViewerInputService.test.ts
  functional/
    quiz-workflow.test.ts
```

## Configuration

Default config in `QuizStore.createDefaultSession()`:

```typescript
{
  closest_k: 1,              // Penalty slope for closest
  time_defaults: {
    qcm: 20,
    image: 20,
    closest: 20,
    open: 30
  },
  viewers_weight: 1,         // Score multiplier
  players_weight: 1,
  allow_multiple_attempts: false,
  first_or_last_wins: "last",
  topN: 10,                  // Leaderboard size
  viewers: {
    allow_answers_in_zoombuzz: false
  }
}
```

## Testing

Run unit and functional tests:
```bash
pnpm test QuizScoringService
pnpm test QuizBuzzerService
pnpm test QuizViewerInputService
pnpm test quiz-workflow
```

## Example Usage

1. **Start Backend**: `pnpm run backend` (port 3002)
2. **Start Next.js**: `pnpm dev` (port 3000)
3. **Open Host Panel**: `http://localhost:3000/quiz/host`
4. **Click "Load Example Questions"**
5. **Add OBS Browser Source**: `http://localhost:3000/overlays/quiz` (1920x1080)
6. **Test Flow**:
   - Click "Start Round"
   - Click "Show" (question appears on overlay, timer starts)
   - Viewers can chat `!a`, `!b`, etc.
   - Click "Lock" (stops voting)
   - Click "Reveal" (shows correct answer and scores)
   - Click "Next" (move to next question)

## Troubleshooting

### Overlay not updating
- Check WebSocket connection at ws://localhost:3001
- Verify backend is running on port 3002
- Check browser console for errors

### Chat commands not working
- Verify Streamer.bot webhook is configured correctly
- Check backend logs for incoming POST requests
- Test manually with curl:
  ```bash
  curl -X POST http://localhost:3002/api/quiz-bot/chat \
    -H "Content-Type: application/json" \
    -d '{"userId":"test","displayName":"TestUser","message":"!a"}'
  ```

### Players not showing
- Quiz reuses guests from the main database
- Add guests via Assets page first
- QuizStore loads first 4 guests automatically

## Future Enhancements

Potential additions (not yet implemented):
- Full overlay renderers for all image modes
- Podium animation for closest mode
- Rolling text for open answers
- Leaderboard display component
- Stream Deck plugin for quiz controls
- Question editor UI
- Import/export question banks


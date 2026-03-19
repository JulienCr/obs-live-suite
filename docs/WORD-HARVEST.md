# Word Harvest — Feature Reference

## What It Is

A live improv game: viewers submit words via chat, the director (regie) approves them, and once the target count is reached, performers must use all words in an improv sketch. The director strikes out words as they are used.

## State Machine

```
idle → collecting → complete → performing → done
 ↑                                    |
 └────────── stop / reset ────────────┘
```

| Phase | Description |
|---|---|
| `idle` | No active game. Start via panel or API. |
| `collecting` | Chat listener active. Words submitted, queued as pending, approved/rejected by regie. Auto-transitions to `complete` when `targetCount` approved words reached. |
| `complete` | Celebration event fires (sound + animation). Chat listener unregistered. Auto-transitions to `performing` after 5 seconds. |
| `performing` | Regie marks words as used (strikethrough). Transitions to `done` when all words used. |
| `done` | All words used. Stays here until reset/stop. |

## Architecture

### Server Side

**`WordHarvestManager`** (`lib/services/WordHarvestManager.ts`) — singleton, in-memory state (no DB persistence). Manages phase transitions, word queuing, dedup, chat listener lifecycle, and publishes events via `ChannelManager`.

**Backend routes** (`server/api/word-harvest.ts`):
```
GET  /state
POST /start    { targetCount?: 3-50 }
POST /stop
POST /reset
POST /approve/:wordId
POST /reject/:wordId
POST /use/:wordId
POST /unuse/:wordId
POST /show
POST /hide
```

**Next.js proxy routes** (`app/api/word-harvest/*`) — 10 routes proxying to backend via `proxyToBackend()`.

### Client Side

| Component | Location | Role |
|---|---|---|
| `WordHarvestPanel` | `components/shell/panels/WordHarvestPanel.tsx` | Dashboard panel: game controls, approve/reject pending words, strike out used words. Also triggers sounds and MIDI. |
| `WordHarvestRenderer` | `components/overlays/WordHarvestRenderer.tsx` | WebSocket consumer for overlay. Processes events, manages local display state, plays sounds. |
| `WordHarvestDisplay` | `components/overlays/WordHarvestDisplay.tsx` | Framer-motion animated word list + celebration overlay. Pure presentational. |
| `wordHarvestAnimations` | `components/overlays/wordHarvestAnimations.ts` | Animation variants (slide-in, celebrate bounce). |
| `WordHarvestMidiSettings` | `components/settings/WordHarvestMidiSettings.tsx` | MIDI CC configuration per event, with test buttons. |

### Overlay Integration

Rendered inside the composite overlay (`app/overlays/composite/page.tsx`) alongside other overlays. Also has a standalone page at `/overlays/word-harvest`.

Words display as animated pills on the right side of the screen. Used words show strikethrough + reduced opacity. Celebration shows centered bouncing gold text.

## Chat Integration

Words come from Twitch/YouTube chat via **StreamerbotGateway**.

`WordHarvestManager` registers a chat listener during `collecting` phase. Each message is matched against:

```regex
/^[#!](?:mot\s+)?(\S+)$/i
```

Matches: `#bateau`, `!mot soleil`, `#Chat`, `!MOT TEST`

Validation: length 2-30 chars. Deduplication is case-insensitive and cross-phase (pending + approved + rejected all tracked in a `seenWords` Set).

## WebSocket Events

Channel: `"word-harvest"` (from `OverlayChannel.WORD_HARVEST`)

| Event Type | Payload | When |
|---|---|---|
| `state-update` | Full `WordHarvestState` | Phase change, show/hide |
| `word-pending` | `{ word: HarvestWord }` | New word from chat |
| `word-approved` | `{ word: HarvestWord }` | Regie approved |
| `word-rejected` | `{ wordId }` | Regie rejected |
| `word-used` | `{ wordId }` | Word struck out during improv |
| `word-unused` | `{ wordId }` | Undo strike-out |
| `celebration` | `{ targetCount }` | Target reached |
| `hide` | — | Overlay hidden |
| `reset` | — | Game reset |

## MIDI

CC messages sent from the dashboard panel via Web MIDI API.

Hook chain: `useWordHarvestMidi` (loads settings, maps events) → `useMidi` (raw Web MIDI access + CC send).

4 configurable events, each with: enabled toggle, channel (1-16), CC number (0-127), value (0-127).

| Event | Default CC | Triggered When |
|---|---|---|
| `wordApproved` | 60 | Word approved by regie |
| `wordUsed` | 62 | Word struck out |
| `celebration` | 72 | Target count reached |
| `improStart` | 64 | Phase transitions to performing |

All disabled by default. Settings persisted via `SettingsService` → SQLite.

Settings API: `GET/POST /api/settings/word-harvest-midi`

## Sound Effects

4 WAV files in `public/sounds/`. Played from the overlay renderer (`WordHarvestRenderer`).

| Sound | File | Event |
|---|---|---|
| Word approved | `word-harvest-approved.wav` | `word-approved` |
| Target reached | `word-harvest-complete.wav` | `celebration` |
| Improv start | `word-harvest-impro-start.wav` | Phase → performing |
| Word used | `word-harvest-used.wav` | `word-used` |

## Data Model

Defined in `lib/models/WordHarvest.ts` (Zod schemas + TypeScript types).

```typescript
interface HarvestWord {
  id: string;              // UUID
  word: string;            // Original casing
  normalizedWord: string;  // Lowercase for dedup
  submittedBy: string;     // Username
  displayName: string;     // Display name
  submittedAt: number;     // Timestamp
  status: "pending" | "approved" | "rejected";
  used: boolean;
  usedAt?: number;
}

interface WordHarvestState {
  phase: WordHarvestPhase;
  targetCount: number;
  pendingWords: HarvestWord[];
  approvedWords: HarvestWord[];
  visible: boolean;
}
```

## Constants

`lib/config/Constants.ts` → `WORD_HARVEST` object:

- `DEFAULT_TARGET_COUNT`: 10
- `MIN_TARGET_COUNT`: 3, `MAX_TARGET_COUNT`: 50
- `MIN_WORD_LENGTH`: 2, `MAX_WORD_LENGTH`: 30
- `WORD_COMMAND_REGEX`: see above
- Sound file paths

## Panel Registration

`lib/panels/registry.ts`: ID `"wordHarvest"`, icon `Wheat` (Lucide), available in sidebar and command palette.

## Tests

`__tests__/services/WordHarvestManager.test.ts` — covers state machine, chat parsing, dedup, approve/reject, completion, mark used/unused, show/hide.

## Known Limitations

- **No persistence**: State is in-memory. Backend restart = game reset.
- **Sound autoplay**: Sounds are triggered from the overlay renderer. OBS browser sources generally allow autoplay, but some configurations may block it.

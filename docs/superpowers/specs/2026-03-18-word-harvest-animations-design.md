# Word Harvest Animations Design

## Context

The Word Harvest overlay (an improv comedy game for live shows) currently has minimal animations: words slide in from the right and a simple scale pulse for celebration. The game deserves fun, energetic, colorful animations that match the improv comedy energy. Additionally, the auto-transition from "complete" to "performing" phase must be replaced with manual regie control.

## Game Phases

```
idle -> collecting -> complete -> performing -> done
```

## 6 Animated Moments

### 1. Game Start Title ("Les 10 mots !")

**Trigger**: Phase transitions to `collecting`, overlay becomes visible.

**Sequence**:
- 0ms: "Les {targetCount} mots !" drops from above with spring bounce (y: -200 -> 0, scale: [0.5, 1.15, 1]). Gold text, 120px, centered.
- 200ms: 10-12 sparkle particles radiate outward from behind title (small colored circles, golden angle distribution, fade over 0.8s).
- 2000ms: Title slides up and shrinks (y -> -400, scale -> 0.5, opacity -> 0).
- 2500ms: Word list area ready to receive words.

### 2. New Word Added (WORD_APPROVED)

**Trigger**: Each approved word appears in the list.

**Animation**:
- Bouncy entrance from right with overshoot: spring stiffness 300, damping 20.
- Scale: [0.8, 1.1, 1] over 0.5s.
- Background flashes gold (`rgba(255, 200, 0, 0.7)`) then settles to normal dark (`rgba(0, 0, 0, 0.6)`) over 0.8s.
- Existing approved sound plays.

### 3. Word Marked as Said (WORD_USED)

**Trigger**: Regie clicks a word to mark it used during improv.

**Animation**:
- Quick horizontal shake: x [0, -6, 6, -3, 0] over 0.3s.
- Strikethrough line draws left-to-right via `scaleX` (0 -> 1) over 0.4s (absolute div, 3px white line).
- Word dims: scale -> 0.95, opacity -> 0.5, brightness -> 0.7.
- Existing used sound plays.

### 4. All Words Collected (CELEBRATION)

**Trigger**: Approved word count reaches target.

**Phase A - Celebration (0-3s)**:
- Word list shakes: x [0, -10, 10, -8, 8, -5, 5, 0] over 0.6s, 2 repeats.
- "Les {targetCount} mots !" title drops in again (same spring animation) with gold glow pulsing textShadow.
- Each word background flashes gold in stagger wave (50ms between each).
- Celebration sound plays.

**Phase B - Breathing/Waiting (3s+, until regie starts improv)**:
- Title exits upward.
- Word list enters gentle breathing: scale [1, 1.02, 1], opacity [0.92, 1, 0.92], 2s infinite loop.
- Subtle shimmer across word backgrounds every 3s (CSS gradient position animation).

### 5. Regie Starts Improv ("10 mots ! Go !")

**Trigger**: Regie clicks "Lancer l'impro !" button (new). Fires `START_PERFORMING` event.

**Animation**:
- Breathing stops, list stabilizes.
- "10 mots ! Go !" explodes onto screen: scale [0, 1.5, 1] with heavy spring, slight rotation wobble [-5, 5, 0], red/orange gradient text, 140px.
- 8 radial energy lines burst from center outward (narrow divs, 200px, white, fade 0.5s).
- After 2s: "Go!" text exits upward.
- Word list at full brightness, slightly stronger backgrounds.
- Impro start sound plays.

### 6. All Words Said - Finale

**Trigger**: All words marked used (`ALL_USED` event, phase = "done").

**Step 1 - Letter Explosions (staggered 100ms per word)**:
- Each word's text splits into individual `<m.span>` per character.
- Letters scatter outward: golden angle distribution, distance 150-450px, rotation +/-180deg, scale -> 0, opacity -> 0 over 0.8s.
- Stagger: 30ms between letters, 100ms between words.

**Step 2 - Confetti (200ms after explosions start)**:
- 3 bursts of 150 particles each, 400ms apart.
- Colors: gold, coral, cyan, pink, purple.
- Gravity 0.8, 200 ticks per particle.
- Uses `canvas-confetti` with Web Worker.

**Step 3 - Fade out (4s after start)**:
- Entire overlay fades to opacity 0 over 1s.
- Overlay hidden. Game over.

## Backend Changes

### Remove auto-transition
In `WordHarvestManager.onTargetReached()`, delete the `setTimeout` that transitions `complete -> performing` after 5s. The game stays in "complete" until manual trigger.

### New event: `START_PERFORMING`
- Add to `WordHarvestEventType` enum: `START_PERFORMING = "start-performing"`
- New method `startPerforming()`: validates phase is "complete", sets "performing", publishes event.
- Payload: `{ targetCount: number }`

### New event: `ALL_USED`
- Add to `WordHarvestEventType` enum: `ALL_USED = "all-used"`
- Published in `markWordUsed()` when all words are used, before STATE_UPDATE.
- Payload: `{ targetCount: number }`

### New API endpoint
- `POST /api/word-harvest/start-performing` (Express + Next.js proxy)

### Dashboard panel
- "Lancer l'impro !" button (orange, Play icon) visible only in "complete" phase.
- Calls `POST /api/word-harvest/start-performing`.

## New Dependency

`canvas-confetti` (~6KB) + `@types/canvas-confetti`. Lightweight, Web Worker support, no React dependency. Works in OBS browser sources.

## Component Architecture

### New files
| File | Purpose |
|------|---------|
| `components/overlays/WordHarvestTitle.tsx` | Animated title for intro/celebration/go |
| `components/overlays/WordHarvestWordList.tsx` | Word list container with shake/breathing |
| `components/overlays/WordHarvestWordItem.tsx` | Per-word: entry flash, used check-off, letter explosion |
| `components/overlays/WordHarvestConfetti.tsx` | canvas-confetti wrapper for finale |
| `components/overlays/WordHarvestSparkles.tsx` | Sparkle burst for title moments |
| `app/api/word-harvest/start-performing/route.ts` | Next.js proxy route |

### Modified files
| File | Changes |
|------|---------|
| `lib/models/WordHarvest.ts` | Add START_PERFORMING, ALL_USED events + types |
| `lib/services/WordHarvestManager.ts` | Remove auto-timer, add startPerforming(), publish ALL_USED |
| `server/api/word-harvest.ts` | Add POST /start-performing route |
| `components/overlays/wordHarvestAnimations.ts` | Expand from ~50 to ~250 lines with all variants |
| `components/overlays/WordHarvestDisplay.tsx` | Orchestrator delegating to sub-components |
| `components/overlays/WordHarvestRenderer.tsx` | Track phase, handle new events, animation flags |
| `components/shell/panels/WordHarvestPanel.tsx` | Add "Start Improv" button |
| `package.json` | Add canvas-confetti |

## Performance Notes

- Letter explosion: only ~60 DOM elements (10 words x 6 chars avg), created only at finale.
- Confetti: Web Worker offloads computation, 150 particles x 3 bursts is lightweight.
- Breathing: GPU-accelerated transforms only (scale, opacity).
- Sparkles: 10-12 elements for 0.8s, then removed.
- All within LazyMotion + domAnimation (tree-shaken).

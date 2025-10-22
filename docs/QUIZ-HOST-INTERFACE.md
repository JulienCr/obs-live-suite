# Quiz Host Interface - User Guide

## Overview

The Quiz Host Interface is a professional 3-panel control dashboard for managing live quiz shows with studio players and Twitch viewers.

**Access**: `http://localhost:3000/quiz/host`

## Layout

### 1. Left Sidebar - Navigator

**Session Management**
- Session name displayed at top
- Rounds list with accordion navigation
- Click round to expand/collapse questions

**Round Status Badges**
- 🟡 **Not started**: Round hasn't begun yet
- 🟢 **Live**: Currently active round
- ⚪ **Done**: Round completed

**Question List**
- Color-coded by type:
  - 🔵 QCM (multiple choice)
  - 🟢 Image (image-based)
  - 🟠 Closest (numeric guess)
  - 🟣 Open (free text)
- Badges: Ready / Accepting / Locked / Revealed
- Click question to jump to it

**Round Controls** (when round is active)
- **Start Round**: Begin the round and load first question
- **End Round**: Force end and close all inputs

---

### 2. Top Bar - Global Controls

Main workflow buttons for question control:

| Button | Shortcut | Action | When Available |
|--------|----------|--------|----------------|
| **Prev Question** | ← | Go to previous question | When not first Q |
| **Show Question** | - | Display question to overlay | When idle |
| **Lock Answers** | Space | Close inputs, freeze choices | When accepting |
| **Reveal Answer** | Space | Show correct answer, apply scores | When locked |
| **Next Question** | → | Move to next question | When not last Q |

Phase indicator shows current state: Idle / Accepting / Locked / Revealed

---

### 3. Center Stage - Question Display

**Header**
- Round title
- Question X/Y counter
- Phase badge (color-coded)

**Question Card**
- Question text (large, bold)
- Type and points info
- Media preview (if image question)

**QCM Options Display**
- Options A, B, C, D in separate cards
- **Viewer vote progress bar** (background)
- Vote count and percentage (top right)
- **Player avatar chips** (assigned players shown)
- Correct answer highlighted green on reveal

**Drag-and-Drop Player Assignment**
1. Drag avatar from right panel
2. Drop onto desired option
3. Avatar appears on option card
4. Repeat for all 4 studio players

**Other Question Types**
- **Closest**: Target value input field, viewer guess histogram
- **Open**: Viewer response counter, scrolling answer display

**Footer Controls**
- ⏱️ **Timer**: MM:SS display (turns red <10s)
  - ▶️ Start / ⏸️ Stop
  - ➕ +10s button (Shortcut: T)
- 🔒 **Lock** button (when accepting)
- ✅ **Reveal** button (when locked)
- 🗑️ **Reset Question** (danger zone - clears votes/timer)

---

### 4. Right Panel - Players & Viewers

**Studio Players (4)**
- Avatar (draggable to options)
- Name
- Current score
- Quick assign buttons (future)

**Top Viewers (leaderboard)**
- Top 5 viewers by score
- Rank, name, score
- Updates in real-time

**Viewer Input Control**
- **Toggle button**: Accepting / Closed
- Shows active viewer count: ⚡ Active viewers: N
- Future: rate-limit indicator

**Event Log** (coming soon)
- Last 5 events with timestamps
- Lock, reveal, score update notifications

---

## Keyboard Shortcuts

Global shortcuts work when not typing in inputs:

| Key | Action |
|-----|--------|
| **Space** | Lock (if accepting) OR Reveal (if locked) |
| **←** | Previous question |
| **→** | Next question |
| **T** | Add 10 seconds to timer |
| **V** | Toggle viewer input on/off |
| **1-4** | Quick points to player 1-4 (future) |

---

## Workflow Example

### Standard QCM Question Flow

1. **Navigator**: Select round and question
2. **Top Bar**: Click "Show Question"
   - Question appears on overlay
   - Timer starts (if configured)
   - Viewers can answer via chat
3. **Center Stage**: 
   - Drag studio player avatars to their chosen options
   - Watch viewer vote percentages update in real-time
4. **Top Bar**: Click "Lock Answers" (or press Space)
   - Inputs close for viewers
   - Player choices frozen
   - Can still adjust players manually if needed
5. **Top Bar**: Click "Reveal Answer" (or press Space)
   - Correct option highlights green
   - Scores calculated and updated
   - Leaderboards refresh
6. **Top Bar**: Click "Next Question" (or press →)
   - Move to next question
7. Repeat steps 2-6 for remaining questions

### Round Management

**Starting a Round**
- Navigator → Click round → "Start Round" button
- Automatically loads first question
- Round badge changes to "Live"

**Ending a Round**
- Navigator → "End Round" button
- Force stops all timers
- Closes viewer inputs
- Round badge changes to "Done"

---

## Tips & Best Practices

### Player Assignment
- **Drag-and-drop**: Fastest for quick assignments
- **Visual feedback**: Options show dashed border while dragging
- **Reassignment**: Just drag to different option
- **Before locking**: Assign all players before clicking Lock

### Timer Management
- Start timer automatically with "Show Question"
- Add time during question with +10s button (T key)
- Timer turns red when <10 seconds (visual alert)
- Stop timer to pause indefinitely

### Phase Management
- Buttons are phase-aware (disabled when not applicable)
- Always follow sequence: Show → Lock → Reveal → Next
- Can skip Lock and go straight to Reveal if needed
- Reset Question only if something goes wrong (danger!)

### Viewer Engagement
- Watch vote percentages to gauge audience
- Keep viewer input open for participation
- Active viewer counter shows engagement level
- Lock when time expires or discussion complete

### Navigation
- Use accordion to jump between questions quickly
- Question badges show completion state
- Round badges show progress at a glance
- Keyboard shortcuts speed up repetitive actions

---

## Troubleshooting

### WebSocket Not Connected
- Check backend is running (`pnpm backend`)
- Connection indicator in Navigator section
- Refresh page if connection lost

### Player Avatars Not Dragging
- Check browser supports HTML5 drag-and-drop (Chrome/Edge recommended)
- Ensure draggable avatars in right panel, not assigned ones on options

### Timer Not Displaying
- Timer only shows when question has time configured
- Check question settings in Question Manager

### Viewer Votes Not Updating
- Requires Streamer.bot integration for Twitch chat
- Check `/api/quiz-bot/chat` endpoint is receiving messages
- Verify viewer input is enabled (toggle in right panel)

---

## Future Enhancements

**Planned Features**:
- Click-to-assign alternative (accessibility)
- Quick assign buttons (A/B/C/D) in players panel
- Real-time event log with WebSocket updates
- Viewer answer rate-limit indicator (msg/s)
- Manual scoring for Open/Closest questions
- Session templates and presets
- Multi-monitor support with separate displays

---

## Related Documentation

- **Quiz System Overview**: `docs/QUIZ-SYSTEM.md`
- **Session Builder**: `docs/QUIZ-COMPLETE-SUMMARY.md`
- **Backend API**: `server/api/quiz.ts`
- **Streamer.bot Integration**: Endpoint documentation in main docs

---

*Last updated: October 2025*


# Stream Deck Integration Guide

## Overview

OBS Live Suite provides HTTP endpoints that can be triggered directly from Stream Deck buttons using the System → Website action.

## Quick Reference

### Most Common Actions

| Action | URL | Method | Body |
|--------|-----|--------|------|
| Show Guest by ID | `http://localhost:3000/api/actions/lower/guest/{id}` | POST | `{"duration":8}` |
| Hide Lower Third | `http://localhost:3000/api/actions/lower/hide` | POST | - |
| Start Countdown | `http://localhost:3000/api/actions/countdown/start` | POST | `{"seconds":300}` |
| Show Poster by ID | `http://localhost:3000/api/actions/poster/show/{id}` | POST | - |
| Hide Poster | `http://localhost:3000/api/actions/poster/hide` | POST | - |
| Next Poster | `http://localhost:3000/api/actions/poster/next` | POST | - |
| Start Streaming | `http://localhost:3002/api/obs/stream` | POST | `{"action":"start"}` |
| Stop Streaming | `http://localhost:3002/api/obs/stream` | POST | `{"action":"stop"}` |

### Getting IDs

**Easy way (Helper Script):**
```bash
pnpm streamdeck:ids
```
This displays all guest and poster IDs with ready-to-use Stream Deck URLs.

**Manual way (API):**
- Guests: `GET http://localhost:3000/api/assets/guests`
- Posters: `GET http://localhost:3000/api/assets/posters`

## Setup Steps

### 1. Configure Base URL

All Stream Deck endpoints are available at:
```
http://localhost:3000/api/
```

### 2. Available Actions

#### Lower Third

**Show Lower Third (Custom Text)**
- URL: `POST http://localhost:3000/api/actions/lower/show`
- Body (JSON):
```json
{
  "title": "John Doe",
  "subtitle": "Host",
  "side": "left",
  "duration": 10
}
```
- Parameters:
  - `title` (required): Main text
  - `subtitle` (optional): Second line of text
  - `side` (optional): "left" or "right", defaults to "left"
  - `duration` (optional): Auto-hide after N seconds

**Show Guest Lower Third (by ID)**
The easiest way to show guest lower thirds is using their database ID:
- URL: `POST http://localhost:3000/api/actions/lower/guest/{guest-id}`
- Optional Body (JSON):
```json
{
  "duration": 8
}
```
- Automatically loads the guest's name, subtitle, and styling from the database

To get the list of guests and their IDs:
- URL: `GET http://localhost:3000/api/assets/guests`
- Returns: `{ "guests": [{ "id": "abc-123", "displayName": "John Doe", ... }] }`

**Show Guest Lower Third (manual)**
Alternatively, you can manually specify the text:
```json
{
  "title": "Guest Name",
  "subtitle": "Guest Role",
  "side": "left",
  "duration": 8
}
```

**Hide Lower Third**
- URL: `POST http://localhost:3000/api/actions/lower/hide`
- No body required

#### Countdown

**Start Countdown**
- URL: `POST http://localhost:3000/api/actions/countdown/start`
- Body (JSON):
```json
{
  "seconds": 300
}
```
- Parameters:
  - `seconds` (required): Duration in seconds

**Pause/Resume/Reset Countdown**
Use the backend API directly:
- Pause: `POST http://localhost:3002/api/overlays/countdown`
  ```json
  { "action": "pause" }
  ```
- Start/Resume: `POST http://localhost:3002/api/overlays/countdown`
  ```json
  { "action": "start" }
  ```
- Reset: `POST http://localhost:3002/api/overlays/countdown`
  ```json
  { "action": "reset" }
  ```

#### Poster

**Show Poster**
- URL: `POST http://localhost:3002/api/overlays/poster`
- Body (JSON):
```json
{
  "action": "show",
  "payload": {
    "imageUrl": "/uploads/posters/my-poster.jpg",
    "title": "Optional Title"
  }
}
```

**Hide Poster**
- URL: `POST http://localhost:3002/api/overlays/poster`
- Body (JSON):
```json
{
  "action": "hide"
}
```

**Next/Previous Poster** (when using rotation mode)
- Next: `POST http://localhost:3002/api/overlays/poster`
  ```json
  { "action": "next" }
  ```
- Previous: `POST http://localhost:3002/api/overlays/poster`
  ```json
  { "action": "previous" }
  ```

#### Macros

**Execute Macro**
- URL: `POST http://localhost:3000/api/actions/macro`
- Body (JSON):
```json
{
  "macroId": "your-macro-id-here"
}
```

#### OBS Control

**Start/Stop Streaming**
- URL: `POST http://localhost:3002/api/obs/stream`
- Body (JSON):
```json
{
  "action": "start"
}
```
- Actions: "start" or "stop"

**Start/Stop Recording**
- URL: `POST http://localhost:3002/api/obs/record`
- Body (JSON):
```json
{
  "action": "start"
}
```
- Actions: "start" or "stop"

**Switch Scene**
- URL: `POST http://localhost:3002/api/obs/scene`
- Body (JSON):
```json
{
  "sceneName": "Main Camera"
}
```

### 3. Stream Deck Button Configuration

1. Add a new button
2. Select **System → Website**
3. Enter the URL
4. Set Method to **POST** (or **GET** for read-only endpoints)
5. Add Request Body if needed (JSON format)
6. Configure icon and title

## Example Button Configurations

### Basic Examples

**"Show Host Lower Third"**
```
URL: http://localhost:3000/api/actions/lower/show
Method: POST
Body: {"title":"John Doe","subtitle":"Host","side":"left","duration":8}
```

**"Hide Lower Third"**
```
URL: http://localhost:3000/api/actions/lower/hide
Method: POST
```

**"5 Minute Countdown"**
```
URL: http://localhost:3000/api/actions/countdown/start
Method: POST
Body: {"seconds":300}
```

**"1 Minute Countdown"**
```
URL: http://localhost:3000/api/actions/countdown/start
Method: POST
Body: {"seconds":60}
```

**"Start Streaming"**
```
URL: http://localhost:3002/api/obs/stream
Method: POST
Body: {"action":"start"}
```

**"Stop Streaming"**
```
URL: http://localhost:3002/api/obs/stream
Method: POST
Body: {"action":"stop"}
```

**"Switch to Main Scene"**
```
URL: http://localhost:3002/api/obs/scene
Method: POST
Body: {"sceneName":"Main Camera"}
```

### Guest Lower Third Workflow

1. **Get your guest IDs** - Run the helper script:
   ```bash
   pnpm streamdeck:ids
   ```
   
   Or manually call `GET http://localhost:3000/api/assets/guests` in a browser or API client.
   
   You'll get a response like:
   ```json
   {
     "guests": [
       { "id": "abc-123", "displayName": "Alice Smith", "subtitle": "Marketing Director" },
       { "id": "def-456", "displayName": "Bob Johnson", "subtitle": "Technical Lead" }
     ]
   }
   ```
   - Note down each guest's ID

2. **Create buttons for each guest using their ID**:

**"Show Guest: Alice Smith"** (Easy Method - Recommended)
```
URL: http://localhost:3000/api/actions/lower/guest/abc-123
Method: POST
Body: {"duration":8}
```
*This automatically pulls Alice's name and subtitle from the database*

**"Show Guest: Bob Johnson"** (Easy Method - Recommended)
```
URL: http://localhost:3000/api/actions/lower/guest/def-456
Method: POST
Body: {"duration":8}
```

**Alternative: Manual Text** (if you prefer not to use database IDs)
```
URL: http://localhost:3000/api/actions/lower/show
Method: POST
Body: {"title":"Alice Smith","subtitle":"Marketing Director","side":"left","duration":8}
```

### Poster Controls

**"Show Poster by ID"** (Easy Method - Recommended)
```
URL: http://localhost:3000/api/actions/poster/show/{poster-id}
Method: POST
```
*Get poster IDs from: `GET http://localhost:3000/api/assets/posters`*

Example:
```
URL: http://localhost:3000/api/actions/poster/show/xyz-789
Method: POST
```

**"Hide Poster"**
```
URL: http://localhost:3000/api/actions/poster/hide
Method: POST
```

**"Next Poster"** (for rotation playlists)
```
URL: http://localhost:3000/api/actions/poster/next
Method: POST
```

**"Previous Poster"** (for rotation playlists)
```
URL: http://localhost:3000/api/actions/poster/previous
Method: POST
```

**Alternative: Show Poster with Custom URL**
```
URL: http://localhost:3002/api/overlays/poster
Method: POST
Body: {"action":"show","payload":{"imageUrl":"/uploads/posters/sponsor-logo.jpg","title":"Optional Title"}}
```

## Advanced: Multi-Action Buttons

Stream Deck's Multi Action feature lets you chain multiple actions:

**Example: "Quick Guest Intro"**
1. Show lower third (8 seconds)
2. Wait 8 seconds
3. Hide lower third

**Example: "Countdown + Scene Switch"**
1. Switch to "Intermission" scene
2. Start 5-minute countdown

**Example: "Stream Start Sequence"**
1. Switch to "Starting Soon" scene
2. Start 60 second countdown
3. Wait 60 seconds
4. Switch to "Main Camera" scene
5. Start streaming

## Pro Tips

### Creating a Guest Panel
1. Create a Stream Deck folder called "Guests"
2. Add one button per guest with their name/photo
3. Each button shows their lower third for 8 seconds
4. Add a "Hide" button at the bottom for manual control

### Macro-Based Approach
For complex sequences, use the Macro system:
1. Create macros in the dashboard (each macro can contain multiple actions)
2. Create Stream Deck buttons that execute macros
3. Update macros without reconfiguring Stream Deck

### URL Shortcuts
Save frequently used URLs in a text file for easy copy/paste:
```
# Lower Third Actions
Show: http://localhost:3000/api/actions/lower/show
Hide: http://localhost:3000/api/actions/lower/hide

# Countdown
Start: http://localhost:3000/api/actions/countdown/start

# OBS
Stream: http://localhost:3002/api/obs/stream
Record: http://localhost:3002/api/obs/record
Scene: http://localhost:3002/api/obs/scene
```

## Troubleshooting

**Button doesn't work**
- Check the application is running: `http://localhost:3000` and `http://localhost:3002`
- Verify JSON syntax in request body (use a JSON validator)
- Check the dashboard or terminal for error messages
- Ensure OBS is running and connected

**Slow response (> 1 second)**
- Normal latency is 50-200ms
- Slow responses may indicate network issues or backend overload
- Check backend health: `http://localhost:3002/health`

**Lower third doesn't show**
- Verify the overlay browser source is added to OBS
- Check that the overlay page loaded: `http://localhost:3000/overlays/composite`
- Look for WebSocket connection status in browser console (F12)

**Guest data not available**
- Ensure guests are created in the Assets page of the dashboard
- Verify database is initialized: check for `data.db` file

**OBS controls don't work**
- Verify OBS WebSocket is enabled (Tools → WebSocket Server Settings)
- Check OBS connection status in dashboard
- Verify credentials match in Settings → OBS tab

## Port Reference

- **3000**: Next.js frontend (dashboard, overlays, main API)
- **3002**: Backend HTTP API (poster, countdown controls, OBS controls)
- **3003**: Backend WebSocket (overlay real-time updates)

Most Stream Deck buttons should use port **3000** (frontend) for simplicity. Use port **3002** (backend) only for advanced features like poster control and direct countdown manipulation.


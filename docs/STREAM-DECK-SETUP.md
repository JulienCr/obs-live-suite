# Stream Deck Integration Guide

## Overview

OBS Live Suite provides HTTP endpoints that can be triggered directly from Stream Deck buttons using the System → Website action.

## Setup Steps

### 1. Configure Base URL

Set this in your Stream Deck button configuration:
```
http://localhost:3000/api/actions/
```

### 2. Available Actions

#### Lower Third

**Show Lower Third**
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

**Pause/Resume** - Use dashboard controls

#### Macros

**Execute Macro**
- URL: `POST http://localhost:3000/api/actions/macro`
- Body (JSON):
```json
{
  "macroId": "your-macro-id-here"
}
```

### 3. Stream Deck Button Configuration

1. Add a new button
2. Select **System → Website**
3. Enter the URL
4. Set Method to **POST**
5. Add Request Body if needed
6. Configure icon and title

### 4. Example Buttons

**"Show Host Lower"**
```
URL: http://localhost:3000/api/actions/lower/show
Method: POST
Body: {"title":"John Doe","subtitle":"Host","side":"left"}
```

**"5 Minute Countdown"**
```
URL: http://localhost:3000/api/actions/countdown/start
Method: POST
Body: {"seconds":300}
```

**"Hide All"**
```
URL: http://localhost:3000/api/actions/lower/hide
Method: POST
```

## Advanced: Multi-Action Buttons

You can chain multiple actions using Stream Deck's Multi Action feature:

1. Show lower third
2. Wait 10 seconds
3. Hide lower third

## Troubleshooting

**Button doesn't work**
- Check the application is running (`http://localhost:3000`)
- Verify JSON syntax in request body
- Check browser console for errors

**Slow response**
- Normal - HTTP requests may take 100-500ms
- Consider using macros for complex sequences

**Need feedback on button**
- Currently not supported (coming in v0.2)
- Dashboard shows current overlay states


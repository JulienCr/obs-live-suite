# VDO.Ninja Local Setup Guide

This guide explains how to set up VDO.ninja for local HTTPS access in the OBS Live Suite.

## Problem Solved

VDO.ninja requires a secure context (HTTPS) to access Web Crypto APIs used for WebRTC connections. This setup:
1. Configures both Next.js frontend and Express backend to use HTTPS with locally-trusted certificates
2. Hosts VDO.ninja locally on the backend HTTPS server
3. Allows seamless access across your local network without browser security warnings

## Setup Instructions

### Step 0: Install mkcert and Generate Certificates

This step creates locally-trusted SSL certificates for HTTPS:

```bash
# Install mkcert (Windows - choose one method)
choco install mkcert          # Using Chocolatey
# OR
scoop install mkcert          # Using Scoop

# Install the local certificate authority
mkcert -install

# Generate certificates (from project root)
cd D:\dev\obs-tools
mkcert localhost 192.168.1.10 127.0.0.1 ::1
# This creates: localhost+3.pem and localhost+3-key.pem
```

### Step 1: Download VDO.ninja Files

Choose one of these options to populate `server/static/vdoninja/`:

**Option A: Download Release (Recommended)**

1. Visit https://github.com/steveseguin/vdo.ninja/releases
2. Download the latest release source code (zip or tar.gz)
3. Extract all files into `D:\dev\obs-tools\server\static\vdoninja\`

**Option B: Clone Repository**

```bash
cd D:\dev\obs-tools\server\static\vdoninja
git clone https://github.com/steveseguin/vdo.ninja .
```

After this step, you should have files like:
```
server/static/vdoninja/
  ├── index.html
  ├── *.html (various pages)
  ├── *.js (JavaScript files)
  ├── *.css (Stylesheets)
  └── images/, filters/, translations/, etc.
```

### Step 2: Restart Backend Server

```bash
# If running dev mode:
pnpm dev

# If running backend only:
pnpm backend
```

You should see this log message:
```
VDO.ninja static files served from: D:\dev\obs-tools\server\static\vdoninja
```

### Step 3: Test VDO.ninja Access

Visit https://localhost:3002/vdoninja/ in your browser. You should see the VDO.ninja interface with no security warnings (thanks to mkcert).

### Step 4: Configure Room Settings

1. Open the app at https://localhost:3000 (or https://192.168.1.10:3000 from LAN)
2. Go to Settings > Room Settings
3. Enter your complete local VDO.ninja URL:
   - Example: `https://localhost:3002/vdoninja/?view=abc123&solo&room=yourroom&password=yourpass`
   - The URL will be used as-is in the iframe

### Step 5: Test in Presenter View

1. Navigate to https://localhost:3000/presenter (or https://192.168.1.10:3000/presenter from LAN)
2. The VDO.ninja panel should load with the video feed
3. The video is now served securely from your local backend with full Web Crypto API access

## How It Works

1. **mkcert Certificates**: Creates locally-trusted SSL certificates that work across your LAN
   - No browser security warnings
   - Full access to Web Crypto APIs (required by VDO.ninja)

2. **HTTPS Servers**: Both Next.js (port 3000) and Express backend (port 3002) run with HTTPS

3. **Direct URL Usage**: The VDO.ninja URL you configure is used as-is in the iframe
   - Full control over all VDO.ninja parameters
   - Example: `https://localhost:3002/vdoninja/?view=abc123&solo&room=myroom&password=pass`

4. **Local Hosting**: VDO.ninja files are served from `server/static/vdoninja/` on your backend

## Recommended VDO.ninja Parameters

When configuring your VDO.ninja URL, consider these parameters:

- `view=STREAMID` - View a specific stream
- `solo` - Solo mode (just the video, minimal UI)
- `room=ROOMNAME` - Join a specific room
- `password=PASS` - Room password
- `push=STREAMID` - Push your own video (if needed)
- `controls=0` - Hide VDO.ninja controls
- `cleanoutput` - Minimal UI for embedding

## Fallback Option

If you encounter issues, use the "Open in new tab" button in the VDO.ninja panel. This opens the original HTTPS URL in a separate browser tab.

## Network Access

The solution works across your LAN with HTTPS:
- From the same machine: `https://localhost:3002/vdoninja/` or `https://localhost:3000/presenter`
- From other devices: `https://192.168.1.10:3002/vdoninja/` or `https://192.168.1.10:3000/presenter`

**Important**: Other devices on your network need to trust the mkcert CA:
1. Copy the CA certificate from the machine where you ran `mkcert -install`
2. Find it at: `%LOCALAPPDATA%\mkcert\rootCA.pem` (Windows)
3. Install it on other devices that will access the app

Alternatively, devices will show a security warning but can proceed by accepting the certificate.

## License

VDO.ninja is open source under the MIT License. See https://github.com/steveseguin/vdo.ninja for details.

## Troubleshooting

### VDO.ninja not loading

1. Check that files exist in `server/static/vdoninja/`
2. Verify backend server is running on port 3002
3. Check browser console for errors

### Video not connecting

1. Verify the stream ID is correct
2. Check that the source device is streaming to that ID
3. Ensure your firewall allows WebRTC connections
4. Try opening in a new tab using the button

### Mixed content warnings

If you still see mixed content errors, verify that:
- The iframe src starts with `http://` (not `https://`)
- You're accessing the app via HTTP (not HTTPS)
- The backend port 3002 is correct

## References

- [VDO.ninja Official Site](https://vdo.ninja)
- [VDO.ninja GitHub](https://github.com/steveseguin/vdo.ninja)
- [VDO.ninja Documentation](https://docs.vdo.ninja)

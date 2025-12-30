# Streamer.bot SSL/WSS Setup Guide

## Problem

When using Streamer.bot chat overlay in the Presenter Dashboard, you may see this error:

```
Failed to construct 'WebSocket': An insecure WebSocket connection may not be initiated from a page loaded over HTTPS.
```

This happens because:
- The Streamer.bot overlay iframe is served over **HTTPS** (`https://chat.streamer.bot`)
- But your Streamer.bot WebSocket server uses **ws://** (insecure)
- Browsers block insecure WebSocket connections from HTTPS pages

## Solution: Enable SSL/WSS in Streamer.bot

### Step 1: Generate SSL Certificate

For **local development**, you can use a self-signed certificate:

#### Option A: Using OpenSSL (Recommended)
```bash
# Generate a self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# When prompted, you can use these values:
# Country: US
# State: Your State
# City: Your City
# Organization: Streamer.bot
# Common Name: 100.86.93.19 (or your IP address)
```

This creates two files:
- `cert.pem` - The certificate
- `key.pem` - The private key

#### Option B: Using mkcert (Easier)
```bash
# Install mkcert (https://github.com/FiloSottile/mkcert)
# macOS:
brew install mkcert

# Windows (with Chocolatey):
choco install mkcert

# Then generate certificate:
mkcert 100.86.93.19 localhost 127.0.0.1
```

### Step 2: Configure Streamer.bot

1. Open **Streamer.bot**
2. Go to **Settings → Servers/Clients → WebSocket Server**
3. Enable SSL:
   - ✅ Check **"Enable SSL/TLS"**
   - Select your `cert.pem` file (certificate)
   - Select your `key.pem` file (private key)
   - Port: Keep 4456 or choose another
4. Click **Apply** and restart the WebSocket server

### Step 3: Regenerate Overlay URL

1. In Streamer.bot, generate a new Chat Overlay URL
2. Make sure the configuration has:
   ```json
   {
     "secure": true,  // ← MUST be true
     "host": "100.86.93.19",
     "port": 4456
   }
   ```
3. Copy the new URL (it will use `wss://` instead of `ws://`)
4. Update the room settings in OBS Live Suite with the new URL

### Step 4: Accept Self-Signed Certificate (Dev Only)

If using a self-signed certificate, you'll need to accept it in your browser:

1. Open `https://100.86.93.19:4456` in your browser
2. You'll see a security warning
3. Click **Advanced → Proceed to 100.86.93.19** (or similar)
4. This tells the browser to trust the certificate for this session

**Note**: You may need to do this in every browser you use.

### Step 5: Update Room Settings

1. Go to **Settings → Presenter → Rooms** in OBS Live Suite
2. Edit your room
3. Update the **Twitch Chat URL** field with the new Streamer.bot overlay URL
4. Save

## Testing

1. Open the Presenter Dashboard: `/presenter?room=default&role=presenter`
2. The Streamer.bot chat overlay should load without errors
3. If you still see the warning banner, check:
   - The overlay URL config has `"secure": true`
   - Streamer.bot WebSocket server has SSL enabled
   - You've accepted the self-signed certificate in your browser

## Production Setup

For production, use a real SSL certificate:
- **Let's Encrypt** (free, trusted by all browsers)
- **Commercial CA** (DigiCert, GlobalSign, etc.)

Never use self-signed certificates in production!

## Troubleshooting

### "Certificate not trusted" error
- For dev: Accept the self-signed cert in browser (see Step 4)
- For prod: Use a real CA certificate

### Still seeing ws:// errors
- Double-check `"secure": true` in the overlay config
- Restart Streamer.bot after enabling SSL
- Clear browser cache and reload

### Chat overlay not loading
- Check browser console for specific errors (F12)
- Verify Streamer.bot WebSocket server is running
- Test direct connection: `https://YOUR_IP:4456` should show cert

## Alternative: Use Twitch Native Chat

If SSL setup is too complex, you can use Twitch's native chat embed instead:

```
https://www.twitch.tv/embed/{YOUR_CHANNEL}/chat?parent=localhost&parent=100.86.93.19
```

**Pros**: No SSL setup needed, works everywhere
**Cons**: Twitch-only (no YouTube/multi-platform), fewer customization options

---

**Summary**: Enable SSL in Streamer.bot → Set `secure: true` → Regenerate overlay URL → Update room settings ✅

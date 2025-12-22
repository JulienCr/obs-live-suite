# OBS-Suite Chrome Extension

Chrome extension to quickly add images from any webpage as posters to your OBS Live Suite.

## Features

- Right-click any image on any webpage
- Choose to display it as a Left or Right poster
- Image is automatically downloaded and added to OBS Live Suite
- Automatically tagged with "from-web" for easy organization
- Configurable server URL (supports localhost and remote instances)

## Installation

### 1. Create Extension Icons

You need to create three icon files before loading the extension:

- `icons/icon16.png` - 16x16 pixels (toolbar)
- `icons/icon48.png` - 48x48 pixels (extension management)
- `icons/icon128.png` - 128x128 pixels (Chrome Web Store)

You can:
- Create simple PNG files with "OBS" text or a camera icon
- Use an online tool like [Favicon Generator](https://favicon.io/)
- Design your own icons in any graphics software

**Quick Placeholder Icons:**
Create a simple colored square with "OBS" text for testing. Once you have proper icons, replace them.

### 2. Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `chrome-extension` folder
5. The extension should now appear in your toolbar

### 3. Configure Server URL

1. Click the extension icon in your toolbar
2. Click "Open Settings" (or right-click the extension icon → Options)
3. Enter your OBS Live Suite server URL (default: `http://localhost:3000`)
4. Click "Test Connection" to verify
5. Click "Save Settings"

## Usage

1. Make sure OBS Live Suite is running
2. Browse to any webpage with images
3. Right-click on any image
4. Select "OBS-Suite" → "Show as Left Poster" or "Show as Right Poster"
5. The image will appear on your OBS overlay!

## How It Works

1. **Image Download**: Extension downloads the image from the webpage (bypasses CORS)
2. **Upload**: Sends the image to your OBS Live Suite backend
3. **Create Poster**: Creates a new poster entry with the "from-web" tag
4. **Display**: Triggers the poster to display on your OBS overlay

## Troubleshooting

### "Connection failed" error
- Make sure OBS Live Suite is running
- Verify the server URL in settings
- Check that the port is correct (default: 3000)
- Try the "Test Connection" button in settings

### "Image download failed" error
- Some websites may block image downloads
- Try saving the image locally and uploading through the main app

### Extension not appearing in context menu
- Refresh the webpage
- Try reloading the extension in `chrome://extensions/`
- Make sure you're right-clicking on an actual image

## Development

### File Structure

```
chrome-extension/
├── manifest.json              # Extension configuration
├── background.js              # Service worker (core logic)
├── options/
│   ├── options.html          # Settings page
│   ├── options.js            # Settings logic
│   └── options.css           # Settings styles
├── popup/
│   ├── popup.html            # Popup UI
│   └── popup.js              # Popup logic
└── icons/
    ├── icon16.png            # 16x16 icon
    ├── icon48.png            # 48x48 icon
    └── icon128.png           # 128x128 icon
```

### API Endpoints Used

- `POST /api/assets/upload` - Upload image file
- `POST /api/assets/posters` - Create poster with tags
- `POST /api/overlays/poster` - Trigger poster display

## Publishing to Chrome Web Store (Optional)

1. Create proper icons (16x16, 48x48, 128x128)
2. Test thoroughly on different websites
3. Create a developer account at [Chrome Web Store](https://chrome.google.com/webstore/devconsole)
4. Package the extension as a .zip file
5. Upload and submit for review

## License

Part of OBS Live Suite

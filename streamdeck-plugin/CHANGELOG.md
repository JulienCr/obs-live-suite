# OBS Live Suite - Stream Deck Plugin Changelog

## [1.1.0] - October 23, 2025

### ✨ Added
- **Guest Avatar Display on Buttons**
  - Stream Deck buttons now display guest avatars when a guest is selected
  - Automatic image fetching and conversion to base64 data URIs
  - Beautiful fallback to initials avatar when no image is available
  - Real-time updates when changing guest selection
  - Smart caching to minimize API calls
  - 5-second timeout with graceful fallback

### 🔧 Technical Changes
- New `src/utils/image-helper.ts` utility module
  - `fetchImageAsBase64()` - HTTP/HTTPS image fetching
  - `generateInitialsAvatar()` - SVG avatar generation
  - `getGuestAvatar()` - Smart avatar resolver with fallback
- Updated `src/actions/lower-third-guest.ts`
  - Added `onWillAppear()` lifecycle hook
  - Added `onDidReceiveSettings()` lifecycle hook
  - Added `updateButtonImage()` private method
  - Added `guestsCache` for performance optimization
- Updated `src/utils/api-client.ts`
  - Added `avatarUrl` field to Guest interface
  - Updated type definitions to support null values

### 📚 Documentation
- Updated `docs/STREAM-DECK-PLUGIN.md` with avatar feature details
- Created `streamdeck-plugin/AVATAR-FEATURE.md` comprehensive guide
- Updated `TASKS.md` with implementation notes
- Updated `MEMORY.md` with technical learnings

### 🎯 User Experience
- **Before**: Text-only button labels, unclear which guest is selected
- **After**: Visual avatar display, instant recognition, professional appearance

---

## [1.0.0] - October 2025

### 🎉 Initial Release

#### Features
- 8 Stream Deck actions implemented:
  - **Lower Thirds**: Show Guest, Custom, Hide
  - **Countdown**: Start, Control, Add Time
  - **Posters**: Show, Control
- WebSocket integration for live countdown display
- Dynamic dropdowns populated from backend API
- Professional property inspectors with presets
- Comprehensive documentation

#### Technical
- Built with Elgato Stream Deck SDK v1.0.0
- TypeScript + Rollup build system
- Node.js 20+ runtime in plugin
- Supports Windows 10+ and macOS 12+

#### Documentation
- README with installation guide
- SETUP guide for configuration
- QUICKSTART for rapid onboarding
- IMPLEMENTATION-SUMMARY for developers

---

## Legend
- ✨ **Added**: New features
- 🔧 **Changed**: Changes to existing functionality  
- 🐛 **Fixed**: Bug fixes
- 🗑️ **Removed**: Removed features
- 📚 **Documentation**: Documentation updates
- 🎯 **User Experience**: UX improvements


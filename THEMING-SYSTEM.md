# Theming System

## Overview
The theming system allows customization of colors, fonts, positions, and scales for all overlays (Lower Thirds and Countdown timers).

## Architecture

### Components

#### 1. **Display Components** (Pure Rendering)
- `components/overlays/LowerThirdDisplay.tsx` - Pure rendering component
- `components/overlays/CountdownDisplay.tsx` - Pure rendering component
- These accept props and have no WebSocket logic
- Used in both live overlays and theme preview

#### 2. **Renderer Components** (WebSocket + State)
- `components/overlays/LowerThirdRenderer.tsx` - Live overlay with WebSocket
- `components/overlays/CountdownRenderer.tsx` - Live overlay with WebSocket
- Handle WebSocket connections and state management
- Use Display components for rendering (TODO: refactor)

#### 3. **Theme Editor**
- `components/assets/ThemeManager.tsx` - Main theme management UI
- `components/assets/OverlayCanvas.tsx` - Interactive 16:9 canvas preview
- `components/assets/useLayoutHistory.ts` - Undo/Redo functionality

### Data Models

```typescript
// lib/models/Theme.ts
interface Theme {
  id: string;
  name: string;
  colors: ColorScheme;
  lowerThirdTemplate: LowerThirdTemplate;
  lowerThirdFont: FontConfig;
  lowerThirdLayout: LayoutConfig;  // Position & scale
  countdownStyle: CountdownStyle;
  countdownFont: FontConfig;
  countdownLayout: LayoutConfig;   // Position & scale
  isGlobal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface LayoutConfig {
  x: number;      // Pixels from left (0-1920)
  y: number;      // Pixels from top (0-1080)
  scale: number;  // Scale factor (0.5-2.0)
}
```

## Features

### 1. **Live Preview Canvas**
- 16:9 aspect ratio matching OBS output (1920x1080)
- Drag & drop positioning
- Scale controls (+/- buttons)
- Undo/Redo (Ctrl+Z / Ctrl+Y)
- Grid overlay and center guides
- Real-time updates

### 2. **Theme Settings**
- **Colors**: Primary, Accent, Surface, Text, Success, Warn
- **Lower Third**: Template style, Font family/size/weight, Position, Scale
- **Countdown**: Style (Bold/Corner/Banner), Font, Position, Scale
- **Reset buttons** for colors, fonts, and positions

### 3. **Profile Integration**
- Themes are linked to profiles
- Active profile's theme is applied automatically
- "Apply Theme" button to switch themes
- "Test Lower Third" and "Test Countdown" buttons for preview

### 4. **Default Themes**
Five built-in themes are created on server startup:
1. **Modern Blue** - Classic blue with Inter font
2. **Vibrant Purple** - Purple with bar template
3. **Elegant Red** - Red with card template and Georgia serif
4. **Clean Green** - Green with slide template (right-aligned)
5. **Dark Mode** - Gray slate theme

## API Endpoints

### Theme Management
- `GET /api/themes` - List all themes
- `POST /api/themes` - Create theme
- `PUT /api/themes/:id` - Update theme
- `DELETE /api/themes/:id` - Delete theme

### Profile Management
- `GET /api/profiles` - List profiles
- `PUT /api/profiles/:id` - Update profile (including themeId)

### Overlay Control
- `POST /api/overlays/lower` - Show/hide/update lower third
- `POST /api/overlays/countdown` - Set/start/pause/reset countdown
- `POST /api/actions/lower/guest/:id` - Show guest lower third
- `POST /api/actions/lower/show` - Show custom lower third

## Theme Enrichment Flow

```
1. User action (e.g., click guest, test theme)
   ↓
2. API endpoint receives request
   ↓
3. Backend fetches active profile
   ↓
4. Backend fetches theme from profile.themeId
   ↓
5. Backend enriches payload with theme data
   ↓
6. Backend publishes to WebSocket channel
   ↓
7. Overlay renderer receives enriched payload
   ↓
8. Display component renders with theme
```

## Positioning System

### Lower Third
- **Origin**: Bottom-left corner
- **X coordinate**: Distance from left edge (0-1920px)
- **Y coordinate**: Distance from **TOP** edge (0-1080px)
- **Transform**: `translateY(100%)` to position from bottom
- **CSS**: `left: Xpx; bottom: (1080-Y)px;`

### Countdown
- **Origin**: Center point
- **X coordinate**: Horizontal center position (0-1920px)
- **Y coordinate**: Vertical center position (0-1080px)
- **Transform**: `translate(-50%, -50%)` for centering
- **CSS**: `left: Xpx; top: Ypx;`

## Database Schema

```sql
CREATE TABLE themes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  colors TEXT NOT NULL,              -- JSON ColorScheme
  lowerThirdTemplate TEXT NOT NULL,
  lowerThirdFont TEXT NOT NULL,      -- JSON FontConfig
  lowerThirdLayout TEXT NOT NULL,    -- JSON LayoutConfig
  countdownStyle TEXT NOT NULL,
  countdownFont TEXT NOT NULL,       -- JSON FontConfig
  countdownLayout TEXT NOT NULL,     -- JSON LayoutConfig
  isGlobal INTEGER NOT NULL,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  themeId TEXT,                      -- Foreign key to themes
  isActive INTEGER NOT NULL,
  -- ... other fields
);
```

## Usage Examples

### Apply Theme to Active Profile
```typescript
// In ThemeManager component
const handleApplyTheme = async (themeId: string) => {
  const activeProfile = await getActiveProfile();
  await fetch(`/api/profiles/${activeProfile.id}`, {
    method: "PUT",
    body: JSON.stringify({ ...activeProfile, themeId }),
  });
  
  // Optionally trigger overlay preview
  await testLowerThird();
};
```

### Test Theme Preview
```typescript
const testLowerThird = async () => {
  await fetch("/api/overlays/lower", {
    method: "POST",
    body: JSON.stringify({
      action: "show",
      payload: {
        title: "Theme Preview",
        subtitle: "Testing new theme",
        side: "left",
        duration: 5,
      },
    }),
  });
};
```

### Backend Theme Enrichment
```typescript
// server/api/overlays.ts
async function getActiveTheme(): Promise<Theme | null> {
  const activeProfile = db.getActiveProfile();
  if (!activeProfile?.themeId) return null;
  return db.getThemeById(activeProfile.themeId);
}

router.post("/lower", async (req, res) => {
  const { action, payload } = req.body;
  const theme = await getActiveTheme();
  
  const enrichedPayload = {
    ...payload,
    theme: theme ? {
      colors: theme.colors,
      template: theme.lowerThirdTemplate,
      font: theme.lowerThirdFont,
      layout: theme.lowerThirdLayout,
    } : undefined,
  };
  
  await channelManager.publish(OverlayChannel.LOWER, "show", enrichedPayload);
});
```

## Future Improvements

- [ ] Refactor LowerThirdRenderer/CountdownRenderer to use Display components
- [ ] Add theme import/export functionality
- [ ] Add template preview thumbnails in theme list
- [ ] Support custom templates beyond predefined ones
- [ ] Add animation customization (duration, easing)
- [ ] Add theme inheritance/variants
- [ ] Support per-guest theme overrides


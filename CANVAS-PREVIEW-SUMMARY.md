# Interactive 16:9 Canvas Preview System

## Overview
The theme editor now includes a fully interactive 16:9 canvas that matches your stream's aspect ratio, allowing you to precisely position and scale overlays with real-time visual feedback.

## Key Features

### 🎯 **Accurate 16:9 Canvas**
- Canvas maintains proper 1920x1080 aspect ratio
- Coordinates display in actual pixels
- Center guides and grid overlay for alignment
- Real-time coordinate display below canvas

### 🖱️ **Drag & Drop Positioning**
- **Drag overlays** anywhere on the canvas
- Hover over an overlay to see controls
- Position updates in real-time as you drag
- Coordinates constrained to canvas bounds (0-1920 x 0-1080)

### 📏 **Scale Control**
- **+/- buttons** on each overlay for scaling
- Range: 50% to 200%
- Current scale displayed as percentage
- Scale applies from overlay anchor point

### 📍 **Position Display**
- **Lower Third**: Shows X, Y coordinates and scale
- **Countdown**: Shows X, Y coordinates and scale
- Coordinates shown in actual pixels (1920x1080)
- Updates live as you drag or scale

### ↩️ **Undo/Redo**
- **Undo**: Ctrl+Z (or Cmd+Z on Mac)
- **Redo**: Ctrl+Y or Ctrl+Shift+Z (or Cmd+Y on Mac)
- Visual buttons in the UI
- History of up to 50 layout changes
- Tracks both position and scale changes
- Works for both overlays simultaneously

### 💾 **Persistent Layout**
All position and scale settings are saved with the theme and applied automatically when the theme is active.

## How to Use

### Positioning Lower Thirds
1. **Open theme editor** in Assets → Themes
2. Click **New Theme** or **Edit** existing
3. Find the **Live Preview (16:9 Canvas)**
4. **Drag** the lower third preview to desired position
5. Default position: bottom-left (60, 920)
6. Position is from **bottom-left corner** of overlay

### Positioning Countdown
1. Same canvas as lower third
2. **Drag** the countdown preview to desired position
3. Default position: center (960, 540)
4. Position is from **center** of overlay

### Scaling
1. **Hover** over any overlay
2. Control bar appears at top
3. Click **-** to shrink (minimum 50%)
4. Click **+** to grow (maximum 200%)
5. Scale applies transform without changing content size

### Undo/Redo
1. Make changes to overlay positions or scales
2. Press **Ctrl+Z** to undo last change
3. Press **Ctrl+Y** to redo
4. Or use the **Undo/Redo buttons** above the canvas
5. History remembers your last 50 changes

## Position Reference

### Lower Third Default Positions by Theme:
- **Modern Blue**: Bottom-left (60, 920)
- **Vibrant Purple**: Bottom-left (60, 920)
- **Elegant Red**: Bottom-left (60, 920)
- **Clean Green**: Bottom-right (1860, 920)
- **Dark Mode**: Bottom-left (60, 920)

### Countdown Default Positions by Theme:
- **Modern Blue**: Center (960, 540)
- **Vibrant Purple**: Top-right corner (1780, 40)
- **Elegant Red**: Top-center banner (960, 40)
- **Clean Green**: Center (960, 540)
- **Dark Mode**: Top-right corner (1780, 40)

## Technical Details

### Coordinate System
- **Origin**: Top-left corner (0, 0)
- **Width**: 1920 pixels
- **Height**: 1080 pixels
- **Lower Third**: Positioned from bottom-left, translates up 100%
- **Countdown**: Positioned from center with -50%, -50% translation

### Layout Data Structure
```typescript
{
  x: number,      // Horizontal position in pixels
  y: number,      // Vertical position in pixels
  scale: number   // Scale factor (0.5 to 2.0)
}
```

### Database Storage
Layout data stored as JSON in `themes` table:
- `lowerThirdLayout`: `{"x":60,"y":920,"scale":1}`
- `countdownLayout`: `{"x":960,"y":540,"scale":1}`

### Renderer Application
- Layout data sent via WebSocket with theme
- Renderers apply `left`, `top`, `transform` CSS
- Scale uses `transform: scale()`
- Position uses absolute pixel values

## Benefits

1. **WYSIWYG**: See exactly where overlays will appear on stream
2. **Precision**: Pixel-perfect positioning
3. **Flexibility**: Different positions per theme
4. **Efficiency**: No need to test in OBS to position
5. **Consistency**: Saved positions apply automatically

## Tips

- Use **grid lines** for alignment
- Use **center guides** for symmetric layouts
- **Drag to edges** for corner positions
- **Scale down** for less intrusive overlays
- **Test different positions** for different show types
- Consider **safe zones** (edges may be cut off on some displays)

## Safe Zones Recommendation
- **Left/Right**: Keep at least 40px from edges
- **Top/Bottom**: Keep at least 30px from edges
- **Lower Third**: Default 60px from left is safe
- **Countdown Corner**: 40px from edges is safe


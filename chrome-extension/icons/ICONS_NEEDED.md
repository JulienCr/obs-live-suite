# Extension Icons Required

Before you can load this Chrome extension, you need to create three icon files:

## Required Icons

1. **icon16.png** - 16x16 pixels
   - Used in the browser toolbar

2. **icon48.png** - 48x48 pixels
   - Used in extension management page
   - Used in notifications

3. **icon128.png** - 128x128 pixels
   - Used in Chrome Web Store (if publishing)
   - Used during extension installation

## Quick Solutions

### Option 1: Use Online Tools
- [Favicon Generator](https://favicon.io/) - Generate all sizes at once
- [ResizeImage.net](https://resizeimage.net/) - Resize a single image to multiple sizes

### Option 2: Create Simple Placeholder
Create a simple colored square with "OBS" text:
1. Use any graphics software (Photoshop, GIMP, Canva, etc.)
2. Create a purple gradient background
3. Add white "OBS" text in the center
4. Export in three sizes: 16x16, 48x48, 128x128

### Option 3: Use ImageMagick (Command Line)
If you have ImageMagick installed:

```bash
# Create 16x16 icon
convert -size 16x16 xc:#667eea -gravity center -pointsize 8 -fill white -annotate +0+0 "OBS" icon16.png

# Create 48x48 icon
convert -size 48x48 xc:#667eea -gravity center -pointsize 24 -fill white -annotate +0+0 "OBS" icon48.png

# Create 128x128 icon
convert -size 128x128 xc:#667eea -gravity center -pointsize 64 -fill white -annotate +0+0 "OBS" icon128.png
```

## Design Recommendations

- Use colors from OBS Live Suite brand (purple gradient: #667eea to #764ba2)
- Keep design simple and recognizable at small sizes
- Use a camera or streaming-related icon
- Ensure good contrast for visibility

## After Creating Icons

1. Save all three PNG files in this `icons/` directory
2. You can then load the extension in Chrome at `chrome://extensions/`
3. Enable "Developer mode" and click "Load unpacked"

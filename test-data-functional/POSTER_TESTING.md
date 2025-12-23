# Poster Performance Testing

This directory contains mock data for testing the poster management UI with hundreds of media files.

## Generating Mock Data

Run the performance test script to generate 300 mock posters:

```bash
node scripts/test-poster-performance.cjs
```

This creates `mock-posters.json` with:
- 75% enabled posters (~225)
- 25% disabled posters (~75)
- 60% images, 30% videos, 10% YouTube embeds
- 2-5 random tags per poster
- Varied titles and categories

## Importing into Database

To import the mock data into your database, you can use the Node.js REPL or create a migration script:

```javascript
const { DatabaseService } = require('./lib/services/DatabaseService');
const mockPosters = require('./test-data-functional/mock-posters.json');

const db = DatabaseService.getInstance();
mockPosters.forEach(poster => {
  db.createPoster(poster);
});

console.log(`Imported ${mockPosters.length} posters`);
```

## Performance Testing Checklist

With 300+ posters loaded:

- [ ] Active posters grid scrolls smoothly
- [ ] Image lazy loading works (images load as you scroll)
- [ ] Video previews don't cause lag
- [ ] Disabled posters section expands/collapses without lag
- [ ] Search/autocomplete responds quickly with thumbnails
- [ ] Enabling a disabled poster from search is instant
- [ ] Filter by type (image/video/youtube) works correctly
- [ ] Tag filtering combines properly with search
- [ ] Hover interactions are smooth (video play/pause)
- [ ] Resize window - grid adapts responsively
- [ ] Edit/Delete actions work from any card

## Performance Optimizations Implemented

### Virtualization
- Uses `@tanstack/react-virtual` for efficient rendering
- Only renders visible rows + 2 overscan rows
- Handles 300+ posters without performance degradation

### Lazy Loading
- Images use IntersectionObserver for lazy loading
- 50px rootMargin for smooth preloading
- Loading states with icons during fetch

### Media Optimization
- Videos: hover to play, pause on mouse leave
- YouTube: static thumbnails in grid (no iframe overhead)
- Proper cleanup on component unmount

### Responsive Grid
- 2 cols (mobile < 768px)
- 3 cols (tablet < 1024px)
- 4 cols (desktop < 1280px)
- 5 cols (large desktop ≥ 1280px)
- Debounced resize handling (150ms)

## Known Limitations

- Mock data uses placeholder images (Unsplash URLs)
- Video URLs point to non-existent local files (for structure only)
- YouTube embeds use sample video IDs
- No actual file uploads in mock data

## Cleanup

To remove test data:

```javascript
const { DatabaseService } = require('./lib/services/DatabaseService');
const db = DatabaseService.getInstance();

// Get all posters
const posters = db.getAllPosters();

// Delete all test posters (be careful with this!)
posters.forEach(poster => {
  db.deletePoster(poster.id);
});
```

Or manually delete the `test-data-functional/data.db` file to reset the database.



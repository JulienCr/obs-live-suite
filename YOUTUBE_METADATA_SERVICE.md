# YouTube Metadata Service

This document describes the YouTube metadata fetching service and API endpoint.

## Overview

The YouTube Metadata Service fetches video metadata from the YouTube Data API v3, including:
- Video title
- Duration (in seconds)
- Thumbnail URL (highest quality available)
- Channel title

## Files Created

### 1. Service Layer: `/lib/services/YouTubeMetadataService.ts`
- Singleton service class for YouTube Data API v3 integration
- Method: `fetchMetadata(videoId: string): Promise<YouTubeVideoMetadata | null>`
- Uses `parseISO8601Duration` from `/lib/utils/durationParser.ts`
- Graceful error handling (logs warnings and returns null)
- Checks for API key configuration on initialization

### 2. API Endpoint: `/app/api/youtube/metadata/route.ts`
- GET endpoint: `/api/youtube/metadata?videoId=xxx`
- Query parameter validation using Zod
- Returns structured JSON response with metadata
- Uses `ApiResponses` pattern for consistent responses

### 3. Configuration: `/lib/config/AppConfig.ts`
- Added `YOUTUBE_API_KEY: z.string().optional()` to envSchema
- Added getter method: `get youtubeApiKey(): string | undefined`
- Includes JSDoc comment explaining the API key purpose

### 4. Environment Template: `/.env.example`
- Added YouTube Data API v3 section
- Commented example with setup instructions
- Links to Google Cloud Console for API key creation

## Usage

### Service Usage (TypeScript)

```typescript
import { YouTubeMetadataService } from "@/lib/services/YouTubeMetadataService";

const service = YouTubeMetadataService.getInstance();

// Check if configured
if (!service.isConfigured()) {
  console.warn("YouTube API key not configured");
}

// Fetch metadata
const metadata = await service.fetchMetadata("dQw4w9WgXcQ");

if (metadata) {
  console.log(metadata.title);        // "Video Title"
  console.log(metadata.duration);     // 212 (seconds)
  console.log(metadata.thumbnailUrl); // "https://i.ytimg.com/..."
  console.log(metadata.channelTitle); // "Channel Name"
}
```

### API Endpoint Usage (HTTP)

```bash
# Fetch metadata for a video
curl "http://localhost:3000/api/youtube/metadata?videoId=dQw4w9WgXcQ"
```

**Success Response (200 OK):**
```json
{
  "success": true,
  "metadata": {
    "videoId": "dQw4w9WgXcQ",
    "title": "Rick Astley - Never Gonna Give You Up (Official Video)",
    "duration": 212,
    "thumbnailUrl": "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    "channelTitle": "Rick Astley"
  }
}
```

**Error Responses:**

- **400 Bad Request:** Invalid or missing videoId parameter
- **404 Not Found:** Video not found or metadata unavailable
- **503 Service Unavailable:** YouTube API key not configured

## Configuration

### Environment Variable

Add to your `.env` file:

```bash
# YouTube Data API v3 key for fetching video metadata (title, duration, thumbnail)
# Get your API key from Google Cloud Console: https://console.cloud.google.com/apis/credentials
YOUTUBE_API_KEY=your_api_key_here
```

### Getting a YouTube API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a project (or use an existing one)
3. Enable "YouTube Data API v3" in APIs & Services
4. Create credentials (API key)
5. **Recommended:** Restrict the key to YouTube Data API v3 for security
6. Copy the API key to your `.env` file

### Quota Limits

YouTube Data API v3 has daily quota limits:
- **Free tier:** 10,000 units/day
- **Per video metadata fetch:** ~3 units
- **Approximately:** 3,300 video metadata fetches per day

## Implementation Details

### Duration Parsing

Uses the existing `parseISO8601Duration` utility from `/lib/utils/durationParser.ts`:

```typescript
// YouTube API returns: "PT1H23M45S"
const duration = parseISO8601Duration("PT1H23M45S"); // 5025 seconds
```

### Thumbnail Selection

Selects the highest quality thumbnail available:
1. High quality (1280x720) - preferred
2. Medium quality (320x180) - fallback
3. Default quality (120x90) - last resort

### Error Handling

The service handles errors gracefully:
- Missing API key → logs warning, returns null
- Invalid video ID → logs error, returns null
- Network errors → logs error, returns null
- Parse errors → logs error, returns null

## Testing

Run the test suite:

```bash
pnpm test YouTubeMetadataService.test.ts
```

**Test Coverage:**
- Singleton pattern verification
- Configuration checking
- Input validation (empty, whitespace)
- API key requirement enforcement

## Integration Points

This service can be integrated with:
- **PosterQuickAdd:** Auto-populate video metadata when adding YouTube URLs
- **SubVideoService:** Fetch accurate duration for YouTube videos
- **PosterManager:** Display video information in the UI

## Dependencies

- `zod` - Schema validation
- `parseISO8601Duration` - Duration parsing utility
- `AppConfig` - Configuration management
- `Logger` - Structured logging
- `ApiResponses` - Standardized API responses

## Security Considerations

1. **API Key Protection:**
   - Never commit `.env` with real API keys
   - Use environment variables for production
   - Restrict API key to YouTube Data API v3 only

2. **Rate Limiting:**
   - Consider implementing client-side caching
   - Add rate limiting for repeated requests
   - Monitor quota usage in Google Cloud Console

3. **Input Validation:**
   - Video IDs are validated (1-20 characters)
   - Sanitized before API calls
   - URL parsing handled safely

## Future Enhancements

Potential improvements:
- **Caching:** Cache metadata to reduce API calls
- **Batch Fetching:** Support multiple video IDs in one request
- **Playlist Support:** Fetch metadata for entire playlists
- **Captions:** Fetch available caption tracks
- **Statistics:** Fetch view count, likes, etc.

## Troubleshooting

### "YouTube API key not configured"
- Ensure `YOUTUBE_API_KEY` is set in `.env`
- Restart the application after adding the key

### "YouTube video metadata not found"
- Verify the video ID is correct
- Check if the video is public (private videos won't return metadata)
- Ensure the video hasn't been deleted

### Quota Exceeded
- Check usage in [Google Cloud Console](https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas)
- Wait for daily quota reset (midnight Pacific Time)
- Request quota increase if needed

## Related Files

- `/lib/utils/durationParser.ts` - Duration parsing utilities
- `/lib/utils/urlDetection.ts` - YouTube URL/ID extraction
- `/lib/services/SubVideoService.ts` - Sub-video creation
- `/lib/config/AppConfig.ts` - Application configuration

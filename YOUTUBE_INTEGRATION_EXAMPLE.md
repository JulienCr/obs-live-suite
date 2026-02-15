# YouTube Metadata Service Integration Examples

This document provides practical examples of integrating the YouTube Metadata Service into the existing codebase.

## Example 1: Auto-populate Poster Metadata

When a user adds a YouTube URL in `PosterQuickAdd`, automatically fetch and populate metadata:

```typescript
// In components/assets/PosterQuickAdd.tsx

import { extractYouTubeId, isYouTubeUrl } from "@/lib/utils/urlDetection";

async function handleYouTubeUrl(url: string) {
  // Extract video ID
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    console.error("Invalid YouTube URL");
    return;
  }

  // Fetch metadata from API
  const response = await fetch(
    `/api/youtube/metadata?videoId=${encodeURIComponent(videoId)}`
  );

  if (!response.ok) {
    console.error("Failed to fetch YouTube metadata");
    return;
  }

  const data = await response.json();
  if (data.success && data.metadata) {
    const { title, duration, thumbnailUrl, channelTitle } = data.metadata;

    // Auto-populate form fields
    setTitle(title);
    setDuration(duration);
    setThumbnailUrl(thumbnailUrl);
    setChannelTitle(channelTitle);

    console.log(`Loaded: ${title} (${duration}s) by ${channelTitle}`);
  }
}
```

## Example 2: Validate YouTube Video Duration

When creating sub-videos, validate that the parent video duration is correct:

```typescript
// In lib/services/SubVideoService.ts

import { YouTubeMetadataService } from "./YouTubeMetadataService";
import { extractYouTubeId } from "../utils/urlDetection";

async function validateYouTubeVideoDuration(posterUrl: string): Promise<number | null> {
  const videoId = extractYouTubeId(posterUrl);
  if (!videoId) return null;

  const service = YouTubeMetadataService.getInstance();
  if (!service.isConfigured()) {
    console.warn("YouTube API not configured - cannot validate duration");
    return null;
  }

  const metadata = await service.fetchMetadata(videoId);
  return metadata ? metadata.duration : null;
}

// Usage in createSubVideo
export async function createSubVideoWithValidation(params: CreateSubVideoParams) {
  const parentPoster = this.posterRepository.getById(params.parentPosterId);
  
  if (parentPoster.type === PosterType.YOUTUBE) {
    const actualDuration = await validateYouTubeVideoDuration(parentPoster.url);
    
    if (actualDuration && params.endTime > actualDuration) {
      throw new Error(
        `End time (${params.endTime}s) exceeds video duration (${actualDuration}s)`
      );
    }
  }

  // Continue with normal creation...
}
```

## Example 3: Bulk Metadata Fetching

Fetch metadata for multiple YouTube videos at once:

```typescript
// In app/api/youtube/metadata/bulk/route.ts

import { YouTubeMetadataService } from "@/lib/services/YouTubeMetadataService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";
import { z } from "zod";

const bulkRequestSchema = z.object({
  videoIds: z.array(z.string().min(1).max(20)).max(50), // Limit to 50 videos
});

export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const validationResult = bulkRequestSchema.safeParse(body);

  if (!validationResult.success) {
    return ApiResponses.badRequest(
      "Invalid videoIds array",
      validationResult.error.errors
    );
  }

  const { videoIds } = validationResult.data;
  const service = YouTubeMetadataService.getInstance();

  if (!service.isConfigured()) {
    return ApiResponses.serviceUnavailable("YouTube API key not configured");
  }

  // Fetch metadata for all videos
  const results = await Promise.allSettled(
    videoIds.map((videoId) => service.fetchMetadata(videoId))
  );

  // Separate successful and failed fetches
  const metadata = results
    .map((result, index) => ({
      videoId: videoIds[index],
      metadata: result.status === "fulfilled" ? result.value : null,
      error: result.status === "rejected" ? result.reason : null,
    }));

  return ApiResponses.ok({
    success: true,
    metadata,
  });
}, "[YouTubeBulkMetadataAPI]");
```

## Example 4: Frontend React Hook

Create a custom hook for fetching YouTube metadata in React components:

```typescript
// In hooks/youtube/useYouTubeMetadata.ts

import { useState, useEffect } from "react";
import type { YouTubeVideoMetadata } from "@/lib/services/YouTubeMetadataService";

export function useYouTubeMetadata(videoId: string | null) {
  const [metadata, setMetadata] = useState<YouTubeVideoMetadata | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) {
      setMetadata(null);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/youtube/metadata?videoId=${encodeURIComponent(videoId)}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        if (data.success && data.metadata) {
          setMetadata(data.metadata);
        } else {
          setError("Metadata not found");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message);
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  return { metadata, loading, error };
}

// Usage in a component
function YouTubeInfoCard({ videoId }: { videoId: string }) {
  const { metadata, loading, error } = useYouTubeMetadata(videoId);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!metadata) return null;

  return (
    <div>
      <img src={metadata.thumbnailUrl} alt={metadata.title} />
      <h3>{metadata.title}</h3>
      <p>By {metadata.channelTitle}</p>
      <p>Duration: {formatDuration(metadata.duration)}</p>
    </div>
  );
}
```

## Example 5: Caching Layer

Add a simple in-memory cache to reduce API calls:

```typescript
// In lib/services/YouTubeMetadataCache.ts

import { YouTubeMetadataService, YouTubeVideoMetadata } from "./YouTubeMetadataService";
import { Logger } from "../utils/Logger";

interface CacheEntry {
  metadata: YouTubeVideoMetadata;
  timestamp: number;
}

export class YouTubeMetadataCache {
  private static instance: YouTubeMetadataCache;
  private cache = new Map<string, CacheEntry>();
  private logger: Logger;
  private service: YouTubeMetadataService;
  private ttlMs = 1000 * 60 * 60; // 1 hour cache TTL

  private constructor() {
    this.logger = new Logger("YouTubeMetadataCache");
    this.service = YouTubeMetadataService.getInstance();
  }

  static getInstance(): YouTubeMetadataCache {
    if (!YouTubeMetadataCache.instance) {
      YouTubeMetadataCache.instance = new YouTubeMetadataCache();
    }
    return YouTubeMetadataCache.instance;
  }

  /**
   * Fetch metadata with caching
   */
  async fetchMetadata(videoId: string): Promise<YouTubeVideoMetadata | null> {
    // Check cache first
    const cached = this.cache.get(videoId);
    if (cached && Date.now() - cached.timestamp < this.ttlMs) {
      this.logger.debug(`Cache hit for video: ${videoId}`);
      return cached.metadata;
    }

    // Fetch from API
    this.logger.debug(`Cache miss for video: ${videoId}, fetching from API`);
    const metadata = await this.service.fetchMetadata(videoId);

    if (metadata) {
      // Store in cache
      this.cache.set(videoId, {
        metadata,
        timestamp: Date.now(),
      });
    }

    return metadata;
  }

  /**
   * Clear cache for a specific video or entire cache
   */
  clearCache(videoId?: string): void {
    if (videoId) {
      this.cache.delete(videoId);
      this.logger.info(`Cleared cache for video: ${videoId}`);
    } else {
      this.cache.clear();
      this.logger.info("Cleared entire metadata cache");
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return {
      size: this.cache.size,
      entries: Array.from(this.cache.keys()),
    };
  }
}
```

## Example 6: Integration with Poster Form

Update the poster creation form to fetch metadata automatically:

```typescript
// In components/assets/PosterForm.tsx

import { useState, useEffect } from "react";
import { extractYouTubeId, isYouTubeUrl } from "@/lib/utils/urlDetection";

function PosterForm() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [loadingMetadata, setLoadingMetadata] = useState(false);

  // Auto-fetch metadata when URL changes
  useEffect(() => {
    if (!isYouTubeUrl(url)) return;

    const videoId = extractYouTubeId(url);
    if (!videoId) return;

    setLoadingMetadata(true);

    fetch(`/api/youtube/metadata?videoId=${encodeURIComponent(videoId)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.metadata) {
          setTitle(data.metadata.title);
          setDuration(data.metadata.duration);
        }
      })
      .catch((err) => console.error("Failed to fetch metadata:", err))
      .finally(() => setLoadingMetadata(false));
  }, [url]);

  return (
    <form>
      <input
        type="text"
        placeholder="Video URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />

      {loadingMetadata && <p>Loading metadata...</p>}

      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />

      {duration && <p>Duration: {duration} seconds</p>}

      <button type="submit">Create Poster</button>
    </form>
  );
}
```

## Best Practices

### 1. Always Check Configuration
```typescript
const service = YouTubeMetadataService.getInstance();
if (!service.isConfigured()) {
  // Gracefully degrade or show warning
  return;
}
```

### 2. Handle Null Returns
```typescript
const metadata = await service.fetchMetadata(videoId);
if (!metadata) {
  // Video not found or API error
  console.warn("Could not fetch metadata");
}
```

### 3. Use Caching for Repeated Requests
```typescript
// Don't call the API multiple times for the same video
const cache = YouTubeMetadataCache.getInstance();
const metadata = await cache.fetchMetadata(videoId);
```

### 4. Validate Video IDs First
```typescript
import { extractYouTubeId } from "@/lib/utils/urlDetection";

const videoId = extractYouTubeId(url);
if (!videoId) {
  console.error("Invalid YouTube URL");
  return;
}
```

### 5. Show Loading States
```typescript
const [loading, setLoading] = useState(false);

async function fetchData() {
  setLoading(true);
  try {
    const metadata = await service.fetchMetadata(videoId);
    // Handle metadata
  } finally {
    setLoading(false);
  }
}
```

## Performance Considerations

1. **Batch Requests:** When fetching multiple videos, use bulk endpoint
2. **Cache Results:** Implement caching layer for frequently accessed videos
3. **Debounce User Input:** Don't fetch on every keystroke
4. **Background Fetching:** Fetch metadata in background after user adds URL
5. **Error Recovery:** Retry failed requests with exponential backoff

## Monitoring

Track API usage and errors:

```typescript
// In lib/services/YouTubeMetadataService.ts

private async logApiUsage(videoId: string, success: boolean): Promise<void> {
  await fetch("/api/analytics/youtube-api-usage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      videoId,
      success,
      timestamp: Date.now(),
    }),
  });
}
```

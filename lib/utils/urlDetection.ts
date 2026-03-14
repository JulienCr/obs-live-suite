/**
 * URL detection utilities for PosterQuickAdd
 */

/**
 * Validates if a string is a valid URL
 */
export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    // Try with https:// prefix
    try {
      new URL(`https://${url}`);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Detects if a URL is a YouTube video URL
 */
export function isYouTubeUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  const trimmed = url.trim();
  if (!trimmed) return false;

  return (
    trimmed.includes('youtube.com') ||
    trimmed.includes('youtu.be')
  );
}

/**
 * Extracts YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - VIDEO_ID (bare ID)
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  const trimmed = url.trim();

  // Helper to extract ID from URL object
  const getIdFromUrl = (urlObj: URL): string | null => {
    if (urlObj.hostname.includes('youtube.com')) {
      // Check for /watch?v=ID format
      const videoId = urlObj.searchParams.get('v');
      if (videoId) return videoId;

      // Check for /embed/ID format
      const embedMatch = urlObj.pathname.match(/\/embed\/([^/?]+)/);
      if (embedMatch) return embedMatch[1];
    } else if (urlObj.hostname === 'youtu.be') {
      // Short URL format: youtu.be/ID
      return urlObj.pathname.slice(1).split('?')[0];
    }
    return null;
  };

  try {
    // Try parsing as is
    const urlObj = new URL(trimmed);
    return getIdFromUrl(urlObj);
  } catch {
    // Try parsing with https:// prefix
    try {
      const urlObj = new URL(`https://${trimmed}`);
      return getIdFromUrl(urlObj);
    } catch {
      // Not a URL, treat as just the ID
      // YouTube video IDs are 11 alphanumeric characters
      if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
        return trimmed;
      }
      return null;
    }
  }
}

/**
 * Detects if a URL points to a direct media file (image or video)
 * Based on file extension
 */
export function isDirectMediaUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;

  const trimmed = url.trim().toLowerCase();

  // Must be a valid URL
  if (!isValidUrl(trimmed)) return false;

  // Image extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
  // Video extensions
  const videoExtensions = ['.mp4', '.webm', '.mov'];

  const allExtensions = [...imageExtensions, ...videoExtensions];

  // Check if URL ends with any of these extensions (before query params)
  const urlWithoutQuery = trimmed.split('?')[0];
  return allExtensions.some(ext => urlWithoutQuery.endsWith(ext));
}

/**
 * Determines media type from URL based on file extension
 */
export function getMediaTypeFromUrl(url: string): 'image' | 'video' | null {
  if (!url || typeof url !== 'string') return null;

  const trimmed = url.trim().toLowerCase();
  const urlWithoutQuery = trimmed.split('?')[0];

  // Image extensions
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif'];
  if (imageExtensions.some(ext => urlWithoutQuery.endsWith(ext))) {
    return 'image';
  }

  // Video extensions
  const videoExtensions = ['.mp4', '.webm', '.mov'];
  if (videoExtensions.some(ext => urlWithoutQuery.endsWith(ext))) {
    return 'video';
  }

  return null;
}

/**
 * Extracts filename from URL path
 * Removes extension and decodes URI components
 */
export function getFilenameFromUrl(url: string): string {
  if (!url) return 'Untitled';

  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const filename = pathname.split('/').pop() || 'Untitled';

    // Decode URI components
    const decoded = decodeURIComponent(filename);

    // Remove extension
    const withoutExt = decoded.replace(/\.[^/.]+$/, '');

    return withoutExt || 'Untitled';
  } catch {
    // Fallback: treat as path string
    const parts = url.split('/');
    const filename = parts[parts.length - 1] || 'Untitled';
    const withoutExt = filename.replace(/\.[^/.]+$/, '');
    return withoutExt || 'Untitled';
  }
}

/**
 * Parse an Instagram URL string into a URL object, or return null if not Instagram
 */
function parseInstagramUrl(url: string): URL | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const urlObj = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
    if (urlObj.hostname === 'instagram.com' || urlObj.hostname === 'www.instagram.com') {
      return urlObj;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Detects if a URL is an Instagram URL (post, reel, or profile)
 */
export function isInstagramUrl(url: string): boolean {
  return parseInstagramUrl(url) !== null;
}

const INSTAGRAM_SYSTEM_PATHS = ['p', 'reel', 'reels', 'explore', 'accounts', 'about', 'legal', 'developer', 'stories', 'direct', 'tv'];

/**
 * Differentiates between Instagram URL types
 * - 'post': instagram.com/p/CODE
 * - 'reel': instagram.com/reel/CODE
 * - 'profile': instagram.com/USERNAME (no /p/ or /reel/ segment)
 */
export function getInstagramUrlType(url: string): 'post' | 'reel' | 'profile' | null {
  const urlObj = parseInstagramUrl(url);
  if (!urlObj) return null;

  const path = urlObj.pathname;

  if (/^\/p\/[^/]+\/?$/.test(path)) return 'post';
  if (/^\/reel\/[^/]+\/?$/.test(path)) return 'reel';

  const segments = path.split('/').filter(Boolean);
  if (segments.length === 1 && !INSTAGRAM_SYSTEM_PATHS.includes(segments[0])) {
    return 'profile';
  }

  return null;
}

/**
 * Extracts Instagram username from a profile URL or raw username
 * Works with: instagram.com/USERNAME, instagram.com/USERNAME/, or just "USERNAME"
 */
export function extractInstagramUsername(url: string): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // If it looks like a URL, parse it
  if (trimmed.includes('instagram.com')) {
    try {
      const urlObj = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
      const segments = urlObj.pathname.split('/').filter(Boolean);
      if (segments.length === 1) {
        return segments[0];
      }
      return null;
    } catch {
      return null;
    }
  }

  // Raw username (no spaces, no slashes)
  if (/^[a-zA-Z0-9._]+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

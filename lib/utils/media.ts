import { MediaType } from "../models/Media";

/**
 * YouTube URL patterns
 */
const YOUTUBE_DOMAINS = ["youtube.com", "youtu.be", "youtube-nocookie.com"];
const YOUTUBE_WATCH_REGEX = /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const YOUTUBE_SHORTS_REGEX = /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/;

/**
 * Image file extensions
 */
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];

/**
 * Detect media type from URL
 * Priority: YouTube > MP4 > Image > Invalid
 */
export function detectMediaType(url: string): MediaType | null {
  try {
    const urlObj = new URL(url);

    // 1. Check for YouTube
    if (isYouTubeUrl(urlObj)) {
      return MediaType.YOUTUBE;
    }

    // 2. Check for MP4
    if (isMp4Url(urlObj)) {
      return MediaType.MP4;
    }

    // 3. Check for image
    if (isImageUrl(urlObj)) {
      return MediaType.IMAGE;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Check if URL is a YouTube video
 */
export function isYouTubeUrl(url: URL): boolean {
  const hostname = url.hostname.toLowerCase().replace("www.", "");
  return YOUTUBE_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`));
}

/**
 * Check if URL is an MP4 video
 */
export function isMp4Url(url: URL): boolean {
  const pathname = url.pathname.toLowerCase();
  return pathname.endsWith(".mp4");
}

/**
 * Check if URL is an image
 */
export function isImageUrl(url: URL): boolean {
  const pathname = url.pathname.toLowerCase();
  return IMAGE_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

/**
 * Extract YouTube video ID from URL
 * Supports:
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://youtube.com/shorts/VIDEO_ID
 */
export function extractYouTubeId(url: string): string | null {
  try {
    const urlObj = new URL(url);

    if (!isYouTubeUrl(urlObj)) {
      return null;
    }

    // Check for shorts format
    const shortsMatch = url.match(YOUTUBE_SHORTS_REGEX);
    if (shortsMatch) {
      return shortsMatch[1];
    }

    // Check for watch/youtu.be format
    const watchMatch = url.match(YOUTUBE_WATCH_REGEX);
    if (watchMatch) {
      return watchMatch[1];
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Get YouTube thumbnail URL from video ID
 */
export function getYouTubeThumbnail(videoId: string, quality: "default" | "hq" | "maxres" = "hq"): string {
  const qualityMap = {
    default: "default",
    hq: "hqdefault",
    maxres: "maxresdefault",
  };
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Convert timecode string (HH:MM:SS or MM:SS) to seconds
 */
export function timecodeToSeconds(timecode: string): number {
  const parts = timecode.split(":").map(Number);

  if (parts.length === 2) {
    // MM:SS
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  throw new Error(`Invalid timecode format: ${timecode}`);
}

/**
 * Convert seconds to timecode string (HH:MM:SS)
 */
export function secondsToTimecode(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => String(n).padStart(2, "0");

  if (hours > 0) {
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Parse timecode to seconds (null-safe)
 */
export function parseTimecode(timecode?: string): number | undefined {
  if (!timecode) return undefined;
  try {
    return timecodeToSeconds(timecode);
  } catch {
    return undefined;
  }
}

/**
 * Format seconds to timecode (null-safe)
 */
export function formatTimecode(seconds?: number): string | undefined {
  if (seconds === undefined || seconds === null) return undefined;
  return secondsToTimecode(seconds);
}

/**
 * Validate URL format
 */
export function isValidUrl(urlString: string): boolean {
  try {
    new URL(urlString);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate URL is HTTPS
 */
export function isHttpsUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Get file extension from URL
 */
export function getFileExtension(url: string): string | null {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    const match = pathname.match(/\.([a-z0-9]+)$/i);
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Generate media item title from URL
 * Falls back to filename or domain
 */
export function generateMediaTitle(url: string, type: MediaType): string {
  try {
    const urlObj = new URL(url);

    if (type === MediaType.YOUTUBE) {
      const videoId = extractYouTubeId(url);
      return videoId ? `YouTube Video (${videoId})` : "YouTube Video";
    }

    // Try to get filename from pathname
    const pathname = urlObj.pathname;
    const filename = pathname.split("/").pop();
    if (filename) {
      // Remove extension and decode
      const nameWithoutExt = filename.replace(/\.[^.]+$/, "");
      return decodeURIComponent(nameWithoutExt);
    }

    // Fallback to domain
    return urlObj.hostname;
  } catch {
    return "Media Item";
  }
}

/**
 * Validate timecode format (HH:MM:SS or MM:SS)
 */
export function isValidTimecode(timecode: string): boolean {
  const regex = /^(?:\d{1,2}:)?[0-5]?\d:[0-5]\d$/;
  return regex.test(timecode);
}

/**
 * Normalize timecode to HH:MM:SS format
 */
export function normalizeTimecode(timecode: string): string {
  const seconds = timecodeToSeconds(timecode);
  return secondsToTimecode(seconds);
}

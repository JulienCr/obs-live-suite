import { CueType, CueFrom, CueSeverity } from "@/lib/models/Cue";
import { BACKEND_URL } from "@/lib/config/urls";

/**
 * Options for sending a presenter notification
 */
export interface NotificationOptions {
  type: "guest" | "poster" | "lower-third";
  title: string;
  body?: string;
  imageUrl?: string;
  bullets?: string[];
  links?: Array<{ url: string; title?: string }>;
  severity?: CueSeverity;
  guestId?: string; // For tracking guest on screen
  posterId?: string; // For tracking poster on screen
}

// ============================================================================
// Notification Factory Types
// ============================================================================

/**
 * Payload for lower third notifications (manual/custom lower thirds)
 */
export interface LowerThirdNotificationPayload {
  title?: string;
  subtitle?: string;
  body?: string;
  imageUrl?: string;
}

/**
 * Payload for guest notifications (when showing a guest lower third)
 */
export interface GuestNotificationPayload {
  displayName: string;
  subtitle?: string;
  avatarUrl?: string;
  guestId: string;
}

/**
 * Poster media type
 */
export type PosterMediaType = 'image' | 'youtube' | 'video';

/**
 * Payload for poster notifications
 */
export interface PosterNotificationPayload {
  title: string;
  description?: string;
  fileUrl: string;
  type: PosterMediaType;
  source?: string;
  posterId?: string;
}

// ============================================================================
// YouTube Utilities
// ============================================================================

/**
 * Extract YouTube video ID from various URL formats
 * Supports: youtube.com/watch?v=, youtu.be/, youtube.com/embed/
 */
export function extractYoutubeVideoId(url: string): string | null {
  if (!url) return null;

  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/youtube\.com\/watch\?v=([^&]+)/);
  if (watchMatch) return watchMatch[1];

  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?]+)/);
  if (shortMatch) return shortMatch[1];

  // youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?]+)/);
  if (embedMatch) return embedMatch[1];

  return null;
}

/**
 * Get YouTube thumbnail URL from video ID
 */
export function getYoutubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// ============================================================================
// Link Generation Utilities
// ============================================================================

/**
 * Link labels for different poster media types
 */
const POSTER_LINK_LABELS: Record<PosterMediaType, string> = {
  youtube: 'Voir sur YouTube',
  image: 'Voir l\'image en grand',
  video: 'Voir la video',
};

/**
 * Build a link object for a poster based on its type
 */
function buildPosterLink(
  fileUrl: string,
  type: PosterMediaType
): { url: string; title: string } {
  return {
    url: fileUrl,
    title: POSTER_LINK_LABELS[type],
  };
}

// ============================================================================
// Notification Factory Functions
// ============================================================================

/**
 * Build a notification for a lower third display
 *
 * @param payload - Lower third payload with title, subtitle, body, imageUrl
 * @returns NotificationOptions ready to be sent via sendPresenterNotification
 *
 * @example
 * ```typescript
 * const notification = buildLowerThirdNotification({
 *   title: "John Doe",
 *   subtitle: "Software Engineer",
 *   imageUrl: "/uploads/avatar.png"
 * });
 * await sendPresenterNotification(notification);
 * ```
 */
export function buildLowerThirdNotification(
  payload: LowerThirdNotificationPayload
): NotificationOptions {
  const bullets: string[] = [];
  if (payload.title) bullets.push(payload.title);
  if (payload.subtitle) bullets.push(payload.subtitle);

  const links = payload.imageUrl
    ? [{ url: payload.imageUrl, title: 'Voir l\'image en grand' }]
    : undefined;

  return {
    type: 'lower-third',
    title: 'Lower Third',
    body: payload.body,
    imageUrl: payload.imageUrl,
    bullets: bullets.length > 0 ? bullets : undefined,
    links,
  };
}

/**
 * Build a notification for a guest lower third display
 *
 * @param payload - Guest data with displayName, subtitle, avatarUrl, guestId
 * @returns NotificationOptions ready to be sent via sendPresenterNotification
 *
 * @example
 * ```typescript
 * const notification = buildGuestNotification({
 *   displayName: "Jane Smith",
 *   subtitle: "CEO at TechCorp",
 *   avatarUrl: "/uploads/jane.png",
 *   guestId: "guest-123"
 * });
 * await sendPresenterNotification(notification);
 * ```
 */
export function buildGuestNotification(
  payload: GuestNotificationPayload
): NotificationOptions {
  return {
    type: 'guest',
    title: `Guest: ${payload.displayName}`,
    imageUrl: payload.avatarUrl,
    bullets: payload.subtitle ? [payload.subtitle] : undefined,
    guestId: payload.guestId,
  };
}

/**
 * Build a notification for a poster display
 *
 * Handles different media types (image, youtube, video) with appropriate
 * image URLs and links. For YouTube videos, extracts the thumbnail.
 *
 * @param payload - Poster data with title, description, fileUrl, type, source, posterId
 * @returns NotificationOptions ready to be sent via sendPresenterNotification
 *
 * @example
 * ```typescript
 * const notification = buildPosterNotification({
 *   title: "Episode 42",
 *   description: "Season finale!",
 *   fileUrl: "https://youtube.com/watch?v=abc123",
 *   type: "youtube",
 *   source: "YouTube",
 *   posterId: "poster-456"
 * });
 * await sendPresenterNotification(notification);
 * ```
 */
export function buildPosterNotification(
  payload: PosterNotificationPayload
): NotificationOptions {
  // Build bullets with source if provided
  const bullets: string[] = [];
  if (payload.source) {
    bullets.push(`Source: ${payload.source}`);
  }

  // Build link based on type
  const links = [buildPosterLink(payload.fileUrl, payload.type)];

  // Determine imageUrl based on type
  let imageUrl: string | undefined;
  if (payload.type === 'image') {
    imageUrl = payload.fileUrl;
  } else if (payload.type === 'youtube') {
    const videoId = extractYoutubeVideoId(payload.fileUrl);
    if (videoId) {
      imageUrl = getYoutubeThumbnailUrl(videoId);
    }
  }

  return {
    type: 'poster',
    title: `Poster: ${payload.title}`,
    body: payload.description,
    imageUrl,
    bullets: bullets.length > 0 ? bullets : undefined,
    links,
    posterId: payload.posterId,
  };
}

/**
 * Normalize URL for display
 * @param url - URL to normalize (can be relative or absolute)
 * @returns Normalized URL or undefined if invalid
 */
function normalizeUrl(url: string): string | undefined {
  if (!url || !url.trim()) return undefined;

  const trimmedUrl = url.trim();

  // Already absolute
  if (trimmedUrl.startsWith('http://') || trimmedUrl.startsWith('https://')) {
    return trimmedUrl;
  }

  // Relative URL - keep as-is (browser will resolve based on current domain)
  if (trimmedUrl.startsWith('/')) {
    return trimmedUrl;
  }

  // Invalid format
  return undefined;
}

/**
 * Send a notification to the presenter interface via the cue system
 *
 * This function sends a CONTEXT-type cue message to the default room,
 * which will be displayed in the presenter's CueFeedPanel.
 *
 * The function is non-blocking - if it fails, it will log the error
 * but not throw, ensuring that overlay display is never blocked.
 *
 * @param options - Notification configuration
 * @throws Error if the backend request fails (caller should catch)
 */
export async function sendPresenterNotification(
  options: NotificationOptions
): Promise<void> {
  // Build context payload, omitting undefined/invalid values
  const contextPayload: {
    imageUrl?: string;
    bullets?: string[];
    links?: Array<{ url: string; title?: string }>;
    guestId?: string;
    posterId?: string;
  } = {};

  // Only include imageUrl if it's a valid URL
  if (options.imageUrl) {
    const normalizedImageUrl = normalizeUrl(options.imageUrl);
    if (normalizedImageUrl) {
      contextPayload.imageUrl = normalizedImageUrl;
    } else {
      console.warn('[Notification] Invalid imageUrl, skipping:', options.imageUrl);
    }
  }

  // Only include bullets if array has content
  const filteredBullets = options.bullets?.filter(Boolean);
  if (filteredBullets && filteredBullets.length > 0) {
    contextPayload.bullets = filteredBullets;
  }

  // Only include links if array has content and URLs are valid
  if (options.links && options.links.length > 0) {
    const normalizedLinks: Array<{ url: string; title?: string }> = [];
    for (const link of options.links) {
      const normalizedUrl = normalizeUrl(link.url);
      if (normalizedUrl) {
        normalizedLinks.push({ url: normalizedUrl, title: link.title });
      } else {
        console.warn('[Notification] Invalid link URL, skipping:', link.url);
      }
    }

    if (normalizedLinks.length > 0) {
      contextPayload.links = normalizedLinks;
    }
  }

  // Include guest ID if provided
  if (options.guestId) {
    contextPayload.guestId = options.guestId;
  }

  // Include poster ID if provided
  if (options.posterId) {
    contextPayload.posterId = options.posterId;
  }

  const payload: {
    type: CueType;
    from: CueFrom;
    severity: CueSeverity;
    title: string;
    body?: string;
    pinned: boolean;
    actions: never[];
    contextPayload: typeof contextPayload;
  } = {
    type: CueType.CONTEXT,
    from: CueFrom.SYSTEM,
    severity: options.severity || CueSeverity.INFO,
    title: options.title,
    pinned: false,
    actions: [],
    contextPayload,
  };

  // Only include body if it's a non-empty string
  if (options.body && options.body.trim()) {
    payload.body = options.body;
  }

  const response = await fetch(`${BACKEND_URL}/api/cue/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Failed to send presenter notification: ${errorText}`);
  }
}

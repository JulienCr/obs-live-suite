import { CueType, CueFrom, CueSeverity } from "@/lib/models/Cue";
import { DEFAULT_ROOM_ID } from "@/lib/models/Room";
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
    const normalizedLinks = options.links
      .map(link => {
        const normalizedUrl = normalizeUrl(link.url);
        if (normalizedUrl) {
          return { url: normalizedUrl, title: link.title };
        }
        console.warn('[Notification] Invalid link URL, skipping:', link.url);
        return null;
      })
      .filter((link): link is { url: string; title?: string } => link !== null);

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
    roomId: string;
    type: CueType;
    from: CueFrom;
    severity: CueSeverity;
    title: string;
    body?: string;
    pinned: boolean;
    actions: never[];
    contextPayload: typeof contextPayload;
  } = {
    roomId: DEFAULT_ROOM_ID,
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

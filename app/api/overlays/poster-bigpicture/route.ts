import { DatabaseService } from "@/lib/services/DatabaseService";
import { SettingsService } from "@/lib/services/SettingsService";
import { sendPresenterNotification } from "@/lib/utils/presenterNotifications";
import { sendChatMessageIfEnabled } from "@/lib/utils/chatMessaging";
import { fetchFromBackend, parseBackendResponse } from "@/lib/utils/ProxyHelper";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[OverlaysAPI:PosterBigPicture]";

/**
 * Extract YouTube video ID from various URL formats
 */
function extractYoutubeVideoId(url: string): string | null {
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
function getYoutubeThumbnailUrl(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * POST /api/overlays/poster-bigpicture
 * Control big-picture poster overlay (proxies to backend)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();

  // Proxy to backend using standardized helper (no theme enrichment needed for big-picture - always centered)
  const response = await fetchFromBackend("/api/overlays/poster-bigpicture", {
    method: "POST",
    body,
    errorMessage: "Failed to control big-picture poster",
    logPrefix: LOG_CONTEXT,
  });

  if (!response.ok) {
    return parseBackendResponse(response, LOG_CONTEXT);
  }

  const data = await response.json();

  // Send notification to presenter when showing a big picture poster (non-blocking)
  if (body.action === 'show' && body.payload) {
    try {
      const { posterId, fileUrl, type, source } = body.payload;
      const db = DatabaseService.getInstance();

      // Get title and description from database if posterId is provided
      let title = 'Sans titre';
      let description = undefined;
      if (posterId) {
        const poster = db.getPosterById(posterId);
        if (poster) {
          title = poster.title;
          description = poster.description;
        }
      }

      // Build bullets with only useful context
      const bullets = [];
      if (source) {
        bullets.push(`Source: ${source}`);
      }

      // Build links
      const links = [];
      if (type === 'youtube') {
        links.push({ url: fileUrl, title: 'Voir sur YouTube' });
      } else if (type === 'image') {
        links.push({ url: fileUrl, title: 'Voir l\'image en grand' });
      } else if (type === 'video') {
        links.push({ url: fileUrl, title: 'Voir la vidéo' });
      }

      // Determine imageUrl based on type
      let imageUrl: string | undefined;
      if (type === 'image') {
        imageUrl = fileUrl;
      } else if (type === 'youtube') {
        const videoId = extractYoutubeVideoId(fileUrl);
        if (videoId) {
          imageUrl = getYoutubeThumbnailUrl(videoId);
        }
      }

      await sendPresenterNotification({
        type: 'poster',
        title: `Poster: ${title}`,
        body: description || undefined,
        imageUrl: imageUrl || undefined,
        bullets: bullets.length > 0 ? bullets : undefined,
        links: links.length > 0 ? links : undefined,
        posterId: posterId, // Include poster ID for tracking
      });

      // Send chat message if enabled and defined (non-blocking)
      if (posterId) {
        const poster = db.getPosterById(posterId);
        if (poster?.chatMessage) {
          const settingsService = SettingsService.getInstance();
          const chatSettings = settingsService.getChatMessageSettings();
          sendChatMessageIfEnabled({ enabled: chatSettings.posterChatMessageEnabled }, poster.chatMessage);
        }
      }
    } catch (error) {
      console.error(`${LOG_CONTEXT} Failed to send presenter notification:`, error);
    }
  }

  return ApiResponses.ok(data);
}, LOG_CONTEXT);

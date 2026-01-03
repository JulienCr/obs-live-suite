import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { SettingsService } from "@/lib/services/SettingsService";
import { sendPresenterNotification } from "@/lib/utils/presenterNotifications";
import { BACKEND_URL } from "@/lib/config/urls";

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
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Proxy to backend (no theme enrichment needed for big-picture - always centered)
    const response = await fetch(`${BACKEND_URL}/api/overlays/poster-bigpicture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Next.js BigPicture Poster API] Backend error:", data);
      return NextResponse.json(data, { status: response.status });
    }

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
          body: description,
          imageUrl,
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

            if (chatSettings.posterChatMessageEnabled) {
              fetch(`${BACKEND_URL}/api/streamerbot-chat/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  platform: 'twitch',
                  message: poster.chatMessage,
                }),
              }).catch((error) => {
                console.error("[BigPicturePosterAction] Failed to send chat message:", error);
              });
            }
          }
        }
      } catch (error) {
        console.error('[BigPicturePosterAction] Failed to send presenter notification:', error);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("BigPicture Poster API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to control big-picture poster" },
      { status: 500 }
    );
  }
}

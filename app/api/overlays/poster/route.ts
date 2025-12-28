import { NextRequest, NextResponse } from "next/server";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { enrichPosterPayload } from "@/lib/utils/themeEnrichment";
import { sendPresenterNotification } from "@/lib/utils/presenterNotifications";
import { BACKEND_URL } from "@/lib/config/urls";

/**
 * POST /api/overlays/poster
 * Control poster overlay (proxies to backend)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, payload } = body;

    // Enrich poster payloads with theme data before proxying to backend
    let enrichedBody = body;
    if (action === 'show' && payload) {
      const db = DatabaseService.getInstance();
      enrichedBody = {
        ...body,
        payload: enrichPosterPayload(payload, db),
      };
    }

    // Proxy to backend
    const response = await fetch(`${BACKEND_URL}/api/overlays/poster`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrichedBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("[Next.js Poster API] Backend error:", data);
      return NextResponse.json(data, { status: response.status });
    }

    // Send notification to presenter when showing a poster (non-blocking)
    if (action === 'show' && payload) {
      try {
        const { posterId, fileUrl, type, source, side } = payload;
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

        await sendPresenterNotification({
          type: 'poster',
          title: `Poster: ${title}`,
          body: description,
          imageUrl: type === 'image' ? fileUrl : undefined,
          bullets: bullets.length > 0 ? bullets : undefined,
          links: links.length > 0 ? links : undefined,
        });
      } catch (error) {
        console.error('[PosterAction] Failed to send presenter notification:', error);
      }
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Poster API proxy error:", error);
    return NextResponse.json(
      { error: "Failed to control poster" },
      { status: 500 }
    );
  }
}


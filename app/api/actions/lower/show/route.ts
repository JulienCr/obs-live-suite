import { LowerThirdEventType, OverlayChannel } from "@/lib/models/OverlayEvents";
import { BackendClient } from "@/lib/utils/BackendClient";
import { DatabaseService } from "@/lib/services/DatabaseService";
import { enrichLowerThirdPayload } from "@/lib/utils/themeEnrichment";
import { sendPresenterNotification } from "@/lib/utils/presenterNotifications";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const LOG_CONTEXT = "[ActionsAPI:Lower:Show]";

/**
 * POST /api/actions/lower/show
 * Show lower third (Stream Deck compatible)
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const {
    title,
    subtitle,
    side = "left",
    duration,
    accentColor,
    avatarUrl,
    contentType,
    body: markdownBody,
    imageUrl,
    imageAlt,
  } = body;

  // Build base payload and enrich with theme data using shared utility
  const db = DatabaseService.getInstance();
  const basePayload = {
    title,
    subtitle,
    side,
    duration,
    accentColor,
    avatarUrl,
    contentType,
    body: markdownBody,
    imageUrl,
    imageAlt,
  };

  const enrichedPayload = enrichLowerThirdPayload(basePayload, db);
  console.log(`${LOG_CONTEXT} Publishing with theme:`, !!enrichedPayload.theme);

  await BackendClient.publish(OverlayChannel.LOWER, LowerThirdEventType.SHOW, enrichedPayload);

  // Send notification to presenter (non-blocking)
  try {
    // Build bullets with contextual info only
    const bullets = [];
    if (title) bullets.push(title);
    if (subtitle) bullets.push(subtitle);

    // Build links if image provided
    const links = imageUrl ? [{ url: imageUrl, title: 'Voir l\'image en grand' }] : undefined;

    await sendPresenterNotification({
      type: 'lower-third',
      title: 'Lower Third',
      body: markdownBody,
      imageUrl: imageUrl,
      bullets: bullets.length > 0 ? bullets : undefined,
      links,
    });
  } catch (error) {
    console.error(`${LOG_CONTEXT} Failed to send presenter notification:`, error);
  }

  return ApiResponses.ok({ success: true });
}, LOG_CONTEXT);

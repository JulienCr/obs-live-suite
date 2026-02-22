import { PosterRepository } from "@/lib/repositories/PosterRepository";
import { SettingsService } from "@/lib/services/SettingsService";
import { buildPosterNotification, sendPresenterNotification } from "@/lib/utils/presenterNotifications";
import { sendChatMessageIfEnabled } from "@/lib/utils/chatMessaging";
import type { PosterMediaType } from "@/lib/utils/presenterNotifications";

interface PosterShowPayload {
  posterId?: string;
  fileUrl: string;
  type: PosterMediaType;
  source?: string;
}

/**
 * Send presenter notification and chat message when a poster is shown.
 * Shared by both poster and poster-bigpicture routes.
 *
 * Non-blocking: errors are caught and logged, never thrown.
 */
export async function sendPosterShowNotification(
  payload: PosterShowPayload,
  logContext: string
): Promise<void> {
  try {
    const { posterId, fileUrl, type, source } = payload;
    const posterRepo = PosterRepository.getInstance();

    // Get title and description from database if posterId is provided
    let title = 'Sans titre';
    let description: string | undefined;
    if (posterId) {
      const poster = posterRepo.getById(posterId);
      if (poster) {
        title = poster.title;
        description = poster.description ?? undefined;
      }
    }

    const notification = buildPosterNotification({
      title,
      description,
      fileUrl,
      type,
      source,
      posterId,
    });

    await sendPresenterNotification(notification);

    // Send chat message if enabled and defined (non-blocking)
    if (posterId) {
      const poster = posterRepo.getById(posterId);
      if (poster?.chatMessage) {
        const settingsService = SettingsService.getInstance();
        const chatSettings = settingsService.getChatMessageSettings();
        sendChatMessageIfEnabled({ enabled: chatSettings.posterChatMessageEnabled }, poster.chatMessage);
      }
    }
  } catch (error) {
    console.error(`${logContext} Failed to send presenter notification:`, error);
  }
}

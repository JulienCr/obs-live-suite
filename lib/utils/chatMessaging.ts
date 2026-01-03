import { BACKEND_URL } from "@/lib/config/urls";
import { Logger } from "@/lib/utils/Logger";

const logger = new Logger("ChatMessaging");

/**
 * Send a chat message via the Streamer.bot bridge (fire-and-forget)
 *
 * @param message - The message to send
 * @param platform - Target platform (default: 'twitch')
 */
export function sendChatMessage(message: string, platform: string = "twitch"): void {
  fetch(`${BACKEND_URL}/api/streamerbot-chat/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      platform,
      message,
    }),
  }).catch((error) => {
    logger.error("Failed to send chat message", error);
  });
}

/**
 * Settings object for chat message conditional send
 */
export interface ChatMessageSettings {
  enabled: boolean;
}

/**
 * Send a chat message only if the feature is enabled and message is defined
 *
 * @param settings - Object with enabled flag
 * @param message - The message to send (nullable)
 * @param platform - Target platform (default: 'twitch')
 */
export function sendChatMessageIfEnabled(
  settings: ChatMessageSettings,
  message: string | null | undefined,
  platform: string = "twitch"
): void {
  if (settings.enabled && message) {
    sendChatMessage(message, platform);
  }
}

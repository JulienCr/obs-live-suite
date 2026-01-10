import { OverlayChannel } from "@/lib/models/OverlayEvents";

/**
 * API endpoints for each overlay channel
 */
export const OVERLAY_CHANNEL_ENDPOINTS: Record<OverlayChannel, string> = {
  [OverlayChannel.LOWER]: "/api/overlays/lower",
  [OverlayChannel.POSTER]: "/api/overlays/poster",
  [OverlayChannel.POSTER_BIGPICTURE]: "/api/overlays/poster-bigpicture",
  [OverlayChannel.CHAT_HIGHLIGHT]: "/api/overlays/chat-highlight",
  [OverlayChannel.COUNTDOWN]: "/api/overlays/countdown",
  [OverlayChannel.QUIZ]: "/api/overlays/quiz",
  [OverlayChannel.SYSTEM]: "/api/overlays/system",
};

/**
 * Channels tracked by EventLog
 */
export const EVENT_LOG_CHANNELS: OverlayChannel[] = [
  OverlayChannel.LOWER,
  OverlayChannel.POSTER,
  OverlayChannel.POSTER_BIGPICTURE,
  OverlayChannel.CHAT_HIGHLIGHT,
];

/**
 * All overlay channels for state tracking
 */
export const OVERLAY_STATE_CHANNELS: OverlayChannel[] = [
  OverlayChannel.LOWER,
  OverlayChannel.POSTER,
  OverlayChannel.POSTER_BIGPICTURE,
  OverlayChannel.COUNTDOWN,
  OverlayChannel.CHAT_HIGHLIGHT,
];

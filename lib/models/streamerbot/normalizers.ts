/**
 * Streamerbot Chat - Event Normalizers
 *
 * Functions to normalize Streamer.bot events into our internal ChatMessage format.
 * Each platform/event type has its own normalizer function.
 */

import type { ChatMessage, MessagePart } from "./schemas";
import type {
  TwitchChatMessageEvent,
  TwitchFollowEvent,
  TwitchSubEvent,
  TwitchReSubEvent,
  TwitchGiftSubEvent,
  TwitchRaidEvent,
  TwitchCheerEvent,
  YouTubeChatMessageEvent,
  YouTubeNewSponsorEvent,
  YouTubeSuperChatEvent,
  YouTubeSuperStickerEvent,
} from "./types";

// =============================================================================
// Twitch Normalizers
// =============================================================================

/**
 * Normalize a Twitch.ChatMessage event from Streamer.bot to our internal format
 */
export function normalizeTwitchChatMessage(event: TwitchChatMessageEvent): ChatMessage {
  const { data } = event;
  const msg = data.message;
  const user = data.user;

  // Debug logging for moderation IDs
  console.log(`[Streamerbot] Twitch message received:`, {
    "msg.msgId": msg.msgId,
    "msg.userId": msg.userId,
    "user?.id": user?.id,
    "data.messageId": data.messageId,
    username: msg.username,
    displayName: msg.displayName,
  });

  // Parse message parts from payload (text + emotes)
  const parts: MessagePart[] = msg.parts?.map((part) => {
    if (part.type === "emote") {
      return { type: "emote" as const, name: part.text || part.name || "", imageUrl: part.imageUrl || "" };
    }
    return { type: "text" as const, text: part.text || "" };
  }) ?? [{ type: "text" as const, text: msg.message || data.text || "" }];

  return {
    id: msg.msgId || data.messageId || `${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    platform: "twitch",
    eventType: "message",
    channel: msg.channel,
    username: msg.username || user?.login || "Unknown",
    displayName: msg.displayName || user?.name || msg.username || "Unknown",
    message: msg.message || data.text || "",
    parts,
    metadata: {
      badges: msg.badges?.map((b) => ({
        name: b.name,
        version: b.version,
        imageUrl: b.imageUrl,
      })) ?? [],
      isMod: msg.role === 3 || msg.isModerator,
      isBroadcaster: msg.role === 4,
      isVip: msg.role === 2,
      isSubscriber: msg.subscriber || user?.subscribed,
      subscriptionTier: msg.subscriptionTier as "1000" | "2000" | "3000" | undefined,
      monthsSubscribed: msg.monthsSubscribed,
      color: msg.color,
      isHighlighted: msg.isHighlighted,
      isMe: msg.isMe,
      isReply: msg.isReply,
      replyTo: msg.replyParentMsgId ? {
        messageId: msg.replyParentMsgId,
        username: msg.replyParentUserLogin || "",
        displayName: msg.replyParentDisplayName || "",
      } : undefined,
      twitchMsgId: msg.msgId,
      twitchUserId: msg.userId || user?.id,
    },
    rawPayload: event,
  };
}

/**
 * Normalize a Twitch.Follow event
 */
export function normalizeTwitchFollowEvent(event: TwitchFollowEvent): ChatMessage {
  const { data } = event;
  return {
    id: `follow-${data.userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "twitch",
    eventType: "follow",
    username: data.userLogin,
    displayName: data.userName,
    message: `${data.userName} just followed!`,
    rawPayload: event,
  };
}

/**
 * Normalize a Twitch.Sub event
 */
export function normalizeTwitchSubEvent(event: TwitchSubEvent): ChatMessage {
  const { data } = event;
  return {
    id: `sub-${data.userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "twitch",
    eventType: "sub",
    username: data.userLogin,
    displayName: data.userName,
    message: data.message || `${data.userName} subscribed!`,
    metadata: {
      subscriptionTier: data.tier as "1000" | "2000" | "3000",
    },
    rawPayload: event,
  };
}

/**
 * Normalize a Twitch.ReSub event
 */
export function normalizeTwitchReSubEvent(event: TwitchReSubEvent): ChatMessage {
  const { data } = event;
  return {
    id: `resub-${data.userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "twitch",
    eventType: "resub",
    username: data.userLogin,
    displayName: data.userName,
    message: data.message || `${data.userName} resubscribed for ${data.cumulativeMonths} months!`,
    metadata: {
      subscriptionTier: data.tier as "1000" | "2000" | "3000",
      monthsSubscribed: data.cumulativeMonths,
    },
    rawPayload: event,
  };
}

/**
 * Normalize a Twitch.GiftSub event
 */
export function normalizeTwitchGiftSubEvent(event: TwitchGiftSubEvent): ChatMessage {
  const { data } = event;
  return {
    id: `giftsub-${data.userId}-${data.recipientUserId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "twitch",
    eventType: "giftsub",
    username: data.userName || "Anonymous",
    displayName: data.userName || "Anonymous",
    message: `${data.userName || "An anonymous user"} gifted a sub to ${data.recipientUserName}!`,
    metadata: {
      subscriptionTier: data.tier as "1000" | "2000" | "3000",
      eventData: { recipient: data.recipientUserName, totalGifts: data.totalGifts },
    },
    rawPayload: event,
  };
}

/**
 * Normalize a Twitch.Raid event
 */
export function normalizeTwitchRaidEvent(event: TwitchRaidEvent): ChatMessage {
  const { data } = event;
  return {
    id: `raid-${data.userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "twitch",
    eventType: "raid",
    username: data.userLogin,
    displayName: data.userName,
    message: `${data.userName} is raiding with ${data.viewers} viewers!`,
    metadata: {
      eventData: { viewers: data.viewers },
    },
    rawPayload: event,
  };
}

/**
 * Normalize a Twitch.Cheer event
 */
export function normalizeTwitchCheerEvent(event: TwitchCheerEvent): ChatMessage {
  const { data } = event;
  return {
    id: `cheer-${data.userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "twitch",
    eventType: "cheer",
    username: data.userName,
    displayName: data.userName,
    message: data.message || `${data.userName} cheered ${data.bits} bits!`,
    metadata: {
      eventData: { bits: data.bits },
    },
    rawPayload: event,
  };
}

// =============================================================================
// YouTube Normalizers
// =============================================================================

/**
 * Normalize a YouTube.Message event
 */
export function normalizeYouTubeChatMessage(event: YouTubeChatMessageEvent): ChatMessage {
  const { data } = event;
  return {
    id: data.messageId || `yt-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    platform: "youtube",
    eventType: "message",
    username: data.userName,
    displayName: data.userName,
    message: data.message,
    parts: [{ type: "text", text: data.message }],
    metadata: {
      isMod: data.isModerator,
      isBroadcaster: data.isOwner,
      isSubscriber: data.isSponsor,
    },
    rawPayload: event,
  };
}

/**
 * Normalize a YouTube.NewSponsor event (membership)
 */
export function normalizeYouTubeNewSponsor(event: YouTubeNewSponsorEvent): ChatMessage {
  const { data } = event;
  return {
    id: `sponsor-${data.userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "youtube",
    eventType: "sub",
    username: data.userName,
    displayName: data.userName,
    message: `${data.userName} became a member!`,
    metadata: {
      eventData: { level: data.level },
    },
    rawPayload: event,
  };
}

/**
 * Normalize a YouTube.SuperChat event
 */
export function normalizeYouTubeSuperChat(event: YouTubeSuperChatEvent): ChatMessage {
  const { data } = event;
  return {
    id: `superchat-${data.userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "youtube",
    eventType: "superchat",
    username: data.userName,
    displayName: data.userName,
    message: data.message || `${data.userName} sent ${data.currency} ${data.amount}!`,
    metadata: {
      eventData: { amount: data.amount, currency: data.currency },
    },
    rawPayload: event,
  };
}

/**
 * Normalize a YouTube.SuperSticker event
 */
export function normalizeYouTubeSuperSticker(event: YouTubeSuperStickerEvent): ChatMessage {
  const { data } = event;
  return {
    id: `supersticker-${data.userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "youtube",
    eventType: "supersticker",
    username: data.userName,
    displayName: data.userName,
    message: `${data.userName} sent a Super Sticker for ${data.currency} ${data.amount}!`,
    metadata: {
      eventData: { amount: data.amount, currency: data.currency, sticker: data.sticker },
    },
    rawPayload: event,
  };
}

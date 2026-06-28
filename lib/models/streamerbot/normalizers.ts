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

// ---------------------------------------------------------------------------
// Defensive field extraction
//
// The @streamerbot/client package types Twitch events loosely and YouTube events
// not at all (`UnknownEventData`), and Streamer.bot has shipped DIFFERENT payload
// shapes across versions for the same event: flat snake_case (user_login /
// user_name — the current Follow/EventSub shape), flat camelCase (userName /
// displayName — Sub/ReSub/Cheer), or a nested user object (user / fromUser /
// targetUser). Reading a single assumed field silently yields an empty name when
// the shape differs, which is the exact bug this guards against. So we read each
// identity from every plausible location and fall back gracefully.
// ---------------------------------------------------------------------------
type LooseData = Record<string, unknown>;

const asStr = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));

/** Resolve a viewer's { login, name } from flat snake_case, flat camelCase, or a nested user object. */
function resolveViewer(
  data: LooseData,
  nestedKeys: string[] = ["user", "fromUser", "targetUser"],
): { login: string; name: string } {
  let login = asStr(data.user_login) || asStr(data.userLogin) || asStr(data.userName) || asStr(data.username);
  let name = asStr(data.user_name) || asStr(data.displayName) || asStr(data.userName) || asStr(data.username);
  for (const key of nestedKeys) {
    const nested = data[key];
    if (nested && typeof nested === "object") {
      const n = nested as LooseData;
      login = login || asStr(n.login) || asStr(n.userLogin) || asStr(n.name);
      name = name || asStr(n.name) || asStr(n.displayName) || asStr(n.login);
    }
  }
  name = name || login;
  return { login, name };
}

/** Normalize a subscription tier (number 1000 or string "1000") to our union. */
function resolveTier(v: unknown): "1000" | "2000" | "3000" {
  const s = asStr(v);
  return s === "2000" || s === "3000" ? s : "1000";
}

/**
 * Normalize a Twitch.Follow event
 */
export function normalizeTwitchFollowEvent(event: TwitchFollowEvent): ChatMessage {
  const data = event.data as unknown as LooseData;
  const { login, name } = resolveViewer(data);
  const userId = asStr(data.user_id) || asStr(data.userId) || login;
  return {
    id: `follow-${userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "twitch",
    eventType: "follow",
    username: login,
    displayName: name,
    message: `${name} just followed!`,
    rawPayload: event,
  };
}

/**
 * Normalize a Twitch.Sub event
 */
export function normalizeTwitchSubEvent(event: TwitchSubEvent): ChatMessage {
  const data = event.data as unknown as LooseData;
  const { login, name } = resolveViewer(data);
  const userId = asStr(data.userId) || asStr(data.user_id) || login;
  return {
    id: `sub-${userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "twitch",
    eventType: "sub",
    username: login,
    displayName: name,
    message: asStr(data.message) || `${name} subscribed!`,
    metadata: {
      subscriptionTier: resolveTier(data.subTier ?? data.tier),
    },
    rawPayload: event,
  };
}

/**
 * Normalize a Twitch.ReSub event
 */
export function normalizeTwitchReSubEvent(event: TwitchReSubEvent): ChatMessage {
  const data = event.data as unknown as LooseData;
  const { login, name } = resolveViewer(data);
  const userId = asStr(data.userId) || asStr(data.user_id) || login;
  const months = Number(data.cumulativeMonths ?? data.monthsSubscribed ?? 0) || 0;
  return {
    id: `resub-${userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "twitch",
    eventType: "resub",
    username: login,
    displayName: name,
    message: asStr(data.message) || `${name} resubscribed for ${months} months!`,
    metadata: {
      subscriptionTier: resolveTier(data.subTier ?? data.tier),
      monthsSubscribed: months,
    },
    rawPayload: event,
  };
}

/**
 * Normalize a Twitch.GiftSub event
 */
export function normalizeTwitchGiftSubEvent(event: TwitchGiftSubEvent): ChatMessage {
  const data = event.data as unknown as LooseData;
  const isAnonymous = Boolean(data.isAnonymous);
  const gifter = resolveViewer(data);
  const gifterName = isAnonymous ? "Anonymous" : gifter.name || "Anonymous";
  const recipientName =
    asStr(data.recipientDisplayName) ||
    asStr(data.recipientUsername) ||
    asStr(data.recipientUserName) ||
    asStr((data.recipient as LooseData | undefined)?.name) ||
    "?";
  const userId = asStr(data.userId) || asStr(data.user_id) || gifter.login;
  const recipientId = asStr(data.recipientUserId) || recipientName;
  return {
    id: `giftsub-${userId}-${recipientId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "twitch",
    eventType: "giftsub",
    username: isAnonymous ? "anonymous" : gifter.login,
    displayName: gifterName,
    message: `${gifterName} gifted a sub to ${recipientName}!`,
    metadata: {
      subscriptionTier: resolveTier(data.subTier ?? data.tier),
      eventData: { recipient: recipientName, totalGifts: Number(data.totalSubsGifted ?? 0) || undefined },
    },
    rawPayload: event,
  };
}

/**
 * Normalize a Twitch.Raid event
 */
export function normalizeTwitchRaidEvent(event: TwitchRaidEvent): ChatMessage {
  const data = event.data as unknown as LooseData;
  const nested = resolveViewer(data, ["fromUser", "user"]);
  const login = asStr(data.from_broadcaster_user_login) || nested.login;
  const name = asStr(data.from_broadcaster_user_name) || nested.name || login;
  const userId = asStr(data.from_broadcaster_user_id) || asStr(data.userId) || login;
  const viewers = Number(data.viewers ?? 0) || 0;
  return {
    id: `raid-${userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "twitch",
    eventType: "raid",
    username: login,
    displayName: name,
    message: `${name} is raiding with ${viewers} viewers!`,
    metadata: {
      eventData: { viewers },
    },
    rawPayload: event,
  };
}

/**
 * Normalize a Twitch.Cheer event
 */
export function normalizeTwitchCheerEvent(event: TwitchCheerEvent): ChatMessage {
  const data = event.data as unknown as LooseData;
  const { login, name } = resolveViewer(data);
  const userId = asStr(data.userId) || asStr(data.user_id) || login;
  const bits = Number(data.bits ?? 0) || 0;
  return {
    id: `cheer-${userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "twitch",
    eventType: "cheer",
    username: login,
    displayName: name,
    message: asStr(data.message) || `${name} cheered ${bits} bits!`,
    metadata: {
      eventData: { bits },
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
  const data = event.data as unknown as LooseData;
  const { name } = resolveViewer(data);
  const text = asStr(data.message);
  return {
    id: asStr(data.messageId) || `yt-${Date.now()}-${Math.random()}`,
    timestamp: Date.now(),
    platform: "youtube",
    eventType: "message",
    username: name,
    displayName: name,
    message: text,
    parts: [{ type: "text", text }],
    metadata: {
      isMod: Boolean(data.isModerator),
      isBroadcaster: Boolean(data.isOwner),
      isSubscriber: Boolean(data.isSponsor),
    },
    rawPayload: event,
  };
}

/**
 * Normalize a YouTube.NewSponsor event (membership)
 */
export function normalizeYouTubeNewSponsor(event: YouTubeNewSponsorEvent): ChatMessage {
  const data = event.data as unknown as LooseData;
  const { name } = resolveViewer(data);
  const userId = asStr(data.userId) || name;
  return {
    id: `sponsor-${userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "youtube",
    eventType: "sub",
    username: name,
    displayName: name,
    message: `${name} became a member!`,
    metadata: {
      eventData: { level: asStr(data.level) || undefined },
    },
    rawPayload: event,
  };
}

/**
 * Normalize a YouTube.SuperChat event
 */
export function normalizeYouTubeSuperChat(event: YouTubeSuperChatEvent): ChatMessage {
  const data = event.data as unknown as LooseData;
  const { name } = resolveViewer(data);
  const userId = asStr(data.userId) || name;
  const amount = Number(data.amount ?? 0) || 0;
  const currency = asStr(data.currency);
  return {
    id: `superchat-${userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "youtube",
    eventType: "superchat",
    username: name,
    displayName: name,
    message: asStr(data.message) || `${name} sent ${currency} ${amount}!`,
    metadata: {
      eventData: { amount, currency },
    },
    rawPayload: event,
  };
}

/**
 * Normalize a YouTube.SuperSticker event
 */
export function normalizeYouTubeSuperSticker(event: YouTubeSuperStickerEvent): ChatMessage {
  const data = event.data as unknown as LooseData;
  const { name } = resolveViewer(data);
  const userId = asStr(data.userId) || name;
  const amount = Number(data.amount ?? 0) || 0;
  const currency = asStr(data.currency);
  return {
    id: `supersticker-${userId}-${Date.now()}`,
    timestamp: Date.now(),
    platform: "youtube",
    eventType: "supersticker",
    username: name,
    displayName: name,
    message: `${name} sent a Super Sticker for ${currency} ${amount}!`,
    metadata: {
      eventData: { amount, currency, sticker: asStr(data.sticker) || undefined },
    },
    rawPayload: event,
  };
}

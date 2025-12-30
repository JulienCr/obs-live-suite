import { z } from "zod";

/**
 * Streamer.bot WebSocket connection settings schema
 * These settings are stored per-room in the database
 */
export const streamerbotConnectionSchema = z.object({
  host: z.string().default("127.0.0.1"),
  port: z.number().int().min(1).max(65535).default(8080),
  endpoint: z.string().default("/"),
  scheme: z.enum(["ws", "wss"]).default("ws"),
  password: z.string().optional(),
  autoConnect: z.boolean().default(true),
  autoReconnect: z.boolean().default(true),
});

export type StreamerbotConnectionSettings = z.infer<typeof streamerbotConnectionSchema>;

/**
 * Default connection settings
 */
export const DEFAULT_STREAMERBOT_CONNECTION: StreamerbotConnectionSettings = {
  host: "127.0.0.1",
  port: 8080,
  endpoint: "/",
  scheme: "ws",
  autoConnect: true,
  autoReconnect: true,
};

/**
 * Chat badge with image URL support
 */
export const chatBadgeSchema = z.object({
  name: z.string(),
  version: z.string().optional(),
  imageUrl: z.string().optional(),
});

export type ChatBadge = z.infer<typeof chatBadgeSchema>;

/**
 * Message part for rendering text and emotes
 */
export const messagePartSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    text: z.string(),
  }),
  z.object({
    type: z.literal("emote"),
    name: z.string(),
    imageUrl: z.string(),
  }),
]);

export type MessagePart = z.infer<typeof messagePartSchema>;

/**
 * Chat event type (message, follow, sub, etc.)
 */
export const chatEventTypeSchema = z.enum([
  "message",      // Regular chat message (Twitch/YouTube)
  "follow",       // Twitch follow
  "sub",          // Twitch sub / YouTube membership
  "resub",        // Twitch resub
  "giftsub",      // Twitch gift sub
  "raid",         // Twitch raid
  "cheer",        // Twitch bits
  "superchat",    // YouTube Super Chat
  "supersticker", // YouTube Super Sticker
]);

export type ChatEventType = z.infer<typeof chatEventTypeSchema>;

/**
 * Chat message metadata (badges, roles, etc.)
 */
export const chatMessageMetadataSchema = z.object({
  badges: z.array(chatBadgeSchema).optional(),
  isMod: z.boolean().optional(),
  isBroadcaster: z.boolean().optional(),
  isVip: z.boolean().optional(),
  isSubscriber: z.boolean().optional(),
  color: z.string().optional(),

  // Subscription info
  subscriptionTier: z.enum(["1000", "2000", "3000"]).optional(),
  monthsSubscribed: z.number().optional(),

  // Message styling flags
  isHighlighted: z.boolean().optional(),
  isMe: z.boolean().optional(),
  isReply: z.boolean().optional(),
  replyTo: z.object({
    messageId: z.string(),
    username: z.string(),
    displayName: z.string(),
  }).optional(),

  // For events (raid, cheer, etc.)
  eventData: z.record(z.unknown()).optional(),
});

export type ChatMessageMetadata = z.infer<typeof chatMessageMetadataSchema>;

/**
 * Supported chat platforms
 */
export const chatPlatformSchema = z.enum(["twitch", "youtube", "trovo"]);
export type ChatPlatform = z.infer<typeof chatPlatformSchema>;

/**
 * Normalized chat message schema
 * This is the format we store/display internally after normalization from Streamer.bot events
 */
export const chatMessageSchema = z.object({
  id: z.string(),
  timestamp: z.number(),
  platform: chatPlatformSchema,
  eventType: chatEventTypeSchema.default("message"),
  channel: z.string().optional(),
  username: z.string(),
  displayName: z.string(),
  message: z.string(),
  parts: z.array(messagePartSchema).optional(),
  metadata: chatMessageMetadataSchema.optional(),
  rawPayload: z.unknown().optional(), // For debugging
});

export type ChatMessage = z.infer<typeof chatMessageSchema>;

/**
 * Highlight rule for keyword-based message highlighting
 */
export const highlightRuleSchema = z.object({
  id: z.string(),
  keyword: z.string(),
  color: z.string(),
  enabled: z.boolean().default(true),
});

export type HighlightRule = z.infer<typeof highlightRuleSchema>;

/**
 * Chat UI preferences schema (stored in localStorage)
 */
export const chatUIPreferencesSchema = z.object({
  fontSize: z.enum(["small", "medium", "large"]).default("medium"),
  compactMode: z.boolean().default(false),
  showTimestamps: z.boolean().default(false),
  highlightRules: z.array(highlightRuleSchema).default([]),
  rememberPassword: z.boolean().default(false),
  autoScroll: z.boolean().default(true),
  maxMessages: z.number().int().min(100).max(10000).default(2000),
});

export type ChatUIPreferences = z.infer<typeof chatUIPreferencesSchema>;

/**
 * Default UI preferences
 */
export const DEFAULT_CHAT_UI_PREFERENCES: ChatUIPreferences = {
  fontSize: "medium",
  compactMode: false,
  showTimestamps: false,
  highlightRules: [],
  rememberPassword: false,
  autoScroll: true,
  maxMessages: 2000,
};

/**
 * Connection status enum
 */
export enum StreamerbotConnectionStatus {
  DISCONNECTED = "disconnected",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  AUTHENTICATING = "authenticating",
  ERROR = "error",
}

/**
 * Connection error types for better error handling
 */
export enum StreamerbotErrorType {
  CONNECTION_REFUSED = "connection_refused",
  AUTH_FAILED = "auth_failed",
  TIMEOUT = "timeout",
  WEBSOCKET_ERROR = "websocket_error",
  CRYPTO_ERROR = "crypto_error", // For WebCrypto issues in OBS CEF
  UNKNOWN = "unknown",
}

/**
 * Connection error with typed error information
 */
export interface StreamerbotConnectionError {
  type: StreamerbotErrorType;
  message: string;
  originalError?: unknown;
}

/**
 * Normalize a Twitch.ChatMessage event from Streamer.bot to our internal format
 */
export function normalizeTwitchChatMessage(event: TwitchChatMessageEvent): ChatMessage {
  const { data } = event;
  const msg = data.message;
  const user = data.user;

  // Parse message parts from payload (text + emotes)
  const parts: MessagePart[] = msg.parts?.map((part: any) => {
    if (part.type === "emote") {
      return { type: "emote", name: part.text || part.name || "", imageUrl: part.imageUrl || "" };
    }
    return { type: "text", text: part.text || "" };
  }) ?? [{ type: "text", text: msg.message || data.text || "" }];

  return {
    id: msg.msgId || data.messageId || `${Date.now()}-${Math.random()}`,
    timestamp: Date.now(), // Streamer.bot doesn't provide message timestamp, use current time
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
      isMod: msg.role === 3 || msg.isModerator, // Role 3 is mod
      isBroadcaster: msg.role === 4, // Role 4 is broadcaster
      isVip: msg.role === 2, // Role 2 is VIP
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
    },
    rawPayload: event,
  };
}

/**
 * Twitch.ChatMessage event payload from Streamer.bot
 * Based on: https://docs.streamer.bot/api/websocket/events/twitch/chat
 */
export interface TwitchChatMessageEvent {
  timeStamp?: string;
  event: {
    source: "Twitch";
    type: "ChatMessage";
  };
  data: {
    message: {
      msgId: string;
      userId: string;
      username: string;
      displayName: string;
      channel: string;
      message: string;
      role: number; // 1=viewer, 2=vip, 3=mod, 4=broadcaster
      subscriber?: boolean;
      subscriptionTier?: string;
      monthsSubscribed?: number;
      isModerator?: boolean;
      isHighlighted?: boolean;
      isMe?: boolean;
      isReply?: boolean;
      replyParentMsgId?: string;
      replyParentUserLogin?: string;
      replyParentDisplayName?: string;
      color?: string;
      badges?: Array<{
        name: string;
        version: string;
        imageUrl: string;
        info?: string;
      }>;
      emotes?: Array<unknown>;
      cheerEmotes?: Array<unknown>;
      parts?: Array<{
        type: "text" | "emote";
        text?: string;
        name?: string;
        imageUrl?: string;
      }>;
    };
    user?: {
      id: string;
      login: string;
      name: string;
      type: string;
      role: number;
      subscribed?: boolean;
      badges?: Array<{
        name: string;
        version: string;
        imageUrl: string;
      }>;
    };
    messageId?: string;
    text?: string;
  };
}

// =============================================================================
// Twitch Event Interfaces and Normalizers
// =============================================================================

/**
 * Twitch.Follow event
 */
export interface TwitchFollowEvent {
  event: { source: "Twitch"; type: "Follow" };
  data: {
    userId: string;
    userName: string;
    userLogin: string;
    followedAt: string;
  };
}

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
 * Twitch.Sub event
 */
export interface TwitchSubEvent {
  event: { source: "Twitch"; type: "Sub" };
  data: {
    userId: string;
    userName: string;
    userLogin: string;
    tier: string;
    message?: string;
  };
}

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
 * Twitch.ReSub event
 */
export interface TwitchReSubEvent {
  event: { source: "Twitch"; type: "ReSub" };
  data: {
    userId: string;
    userName: string;
    userLogin: string;
    tier: string;
    cumulativeMonths: number;
    streakMonths?: number;
    message?: string;
  };
}

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
 * Twitch.GiftSub event
 */
export interface TwitchGiftSubEvent {
  event: { source: "Twitch"; type: "GiftSub" };
  data: {
    userId: string;
    userName: string;
    recipientUserId: string;
    recipientUserName: string;
    tier: string;
    totalGifts?: number;
  };
}

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
 * Twitch.Raid event
 */
export interface TwitchRaidEvent {
  event: { source: "Twitch"; type: "Raid" };
  data: {
    userId: string;
    userName: string;
    userLogin: string;
    viewers: number;
  };
}

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
 * Twitch.Cheer event
 */
export interface TwitchCheerEvent {
  event: { source: "Twitch"; type: "Cheer" };
  data: {
    userId: string;
    userName: string;
    bits: number;
    message?: string;
  };
}

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
// YouTube Event Interfaces and Normalizers
// =============================================================================

/**
 * YouTube.Message event
 */
export interface YouTubeChatMessageEvent {
  event: { source: "YouTube"; type: "Message" };
  data: {
    messageId: string;
    userId: string;
    userName: string;
    message: string;
    isModerator?: boolean;
    isOwner?: boolean;
    isVerified?: boolean;
    isSponsor?: boolean;
  };
}

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
 * YouTube.NewSponsor event (membership)
 */
export interface YouTubeNewSponsorEvent {
  event: { source: "YouTube"; type: "NewSponsor" };
  data: {
    userId: string;
    userName: string;
    level?: string;
  };
}

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
 * YouTube.SuperChat event
 */
export interface YouTubeSuperChatEvent {
  event: { source: "YouTube"; type: "SuperChat" };
  data: {
    userId: string;
    userName: string;
    amount: number;
    currency: string;
    message?: string;
  };
}

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
 * YouTube.SuperSticker event
 */
export interface YouTubeSuperStickerEvent {
  event: { source: "YouTube"; type: "SuperSticker" };
  data: {
    userId: string;
    userName: string;
    amount: number;
    currency: string;
    sticker?: string;
  };
}

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

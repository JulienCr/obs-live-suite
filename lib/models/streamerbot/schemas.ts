/**
 * Streamerbot Chat - Zod Schemas
 *
 * All Zod schemas for validating Streamerbot chat data.
 * Types are automatically inferred from these schemas.
 */

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

  // Twitch moderation IDs
  twitchMsgId: z.string().optional(),
  twitchUserId: z.string().optional(),
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

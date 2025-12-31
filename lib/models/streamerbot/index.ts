/**
 * Streamerbot Chat Module
 *
 * Centralized exports for all Streamerbot chat-related types,
 * schemas, normalizers, and gateway types.
 *
 * This file maintains backward compatibility with the original
 * StreamerbotChat.ts import paths.
 */

// Schemas and types
export {
  // Zod schemas
  streamerbotConnectionSchema,
  chatBadgeSchema,
  messagePartSchema,
  chatEventTypeSchema,
  chatMessageMetadataSchema,
  chatPlatformSchema,
  chatMessageSchema,
  highlightRuleSchema,
  chatUIPreferencesSchema,

  // Inferred types
  type StreamerbotConnectionSettings,
  type ChatBadge,
  type MessagePart,
  type ChatEventType,
  type ChatMessageMetadata,
  type ChatPlatform,
  type ChatMessage,
  type HighlightRule,
  type ChatUIPreferences,

  // Defaults
  DEFAULT_STREAMERBOT_CONNECTION,
  DEFAULT_CHAT_UI_PREFERENCES,

  // Enums
  StreamerbotConnectionStatus,
  StreamerbotErrorType,

  // Interfaces
  type StreamerbotConnectionError,
} from "./schemas";

// Event type interfaces
export type {
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
  TwitchEvent,
  YouTubeEvent,
  StreamerbotEvent,
} from "./types";

// Normalizer functions
export {
  normalizeTwitchChatMessage,
  normalizeTwitchFollowEvent,
  normalizeTwitchSubEvent,
  normalizeTwitchReSubEvent,
  normalizeTwitchGiftSubEvent,
  normalizeTwitchRaidEvent,
  normalizeTwitchCheerEvent,
  normalizeYouTubeChatMessage,
  normalizeYouTubeNewSponsor,
  normalizeYouTubeSuperChat,
  normalizeYouTubeSuperSticker,
} from "./normalizers";

// Gateway types
export type {
  StreamerbotGatewayStatus,
  StreamerbotGatewayMessageType,
  StreamerbotGatewayMessage,
} from "./gateway";

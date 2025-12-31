/**
 * Streamerbot Chat - Event Type Interfaces
 *
 * TypeScript interfaces for Streamer.bot event payloads.
 * These represent the raw data format from Streamer.bot WebSocket events.
 */

// =============================================================================
// Twitch Event Interfaces
// =============================================================================

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

// =============================================================================
// YouTube Event Interfaces
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

// =============================================================================
// Union Types
// =============================================================================

/**
 * All Twitch event types
 */
export type TwitchEvent =
  | TwitchChatMessageEvent
  | TwitchFollowEvent
  | TwitchSubEvent
  | TwitchReSubEvent
  | TwitchGiftSubEvent
  | TwitchRaidEvent
  | TwitchCheerEvent;

/**
 * All YouTube event types
 */
export type YouTubeEvent =
  | YouTubeChatMessageEvent
  | YouTubeNewSponsorEvent
  | YouTubeSuperChatEvent
  | YouTubeSuperStickerEvent;

/**
 * All Streamerbot events
 */
export type StreamerbotEvent = TwitchEvent | YouTubeEvent;

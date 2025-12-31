/**
 * Type declarations for @streamerbot/client
 *
 * These types supplement the official package types which may be incomplete.
 * Based on: https://docs.streamer.bot/api/websocket/
 */

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
} from "@/lib/models/streamerbot/types";

declare module "@streamerbot/client" {
  /**
   * Streamer.bot event types mapped to their payload types
   */
  export interface StreamerbotEventMap {
    // Twitch events
    "Twitch.ChatMessage": TwitchChatMessageEvent;
    "Twitch.Follow": TwitchFollowEvent;
    "Twitch.Sub": TwitchSubEvent;
    "Twitch.ReSub": TwitchReSubEvent;
    "Twitch.GiftSub": TwitchGiftSubEvent;
    "Twitch.Raid": TwitchRaidEvent;
    "Twitch.Cheer": TwitchCheerEvent;

    // YouTube events
    "YouTube.Message": YouTubeChatMessageEvent;
    "YouTube.NewSponsor": YouTubeNewSponsorEvent;
    "YouTube.SuperChat": YouTubeSuperChatEvent;
    "YouTube.SuperSticker": YouTubeSuperStickerEvent;
  }

  /**
   * Send message options
   */
  export interface SendMessageOptions {
    bot?: boolean;
    internal?: boolean;
  }

  /**
   * Streamer.bot WebSocket client
   */
  export interface StreamerbotClient {
    /**
     * Connect to Streamer.bot WebSocket server
     */
    connect(): Promise<void>;

    /**
     * Disconnect from Streamer.bot
     */
    disconnect(): Promise<void>;

    /**
     * Subscribe to a Streamer.bot event
     */
    on<K extends keyof StreamerbotEventMap>(
      event: K,
      listener: (data: StreamerbotEventMap[K]) => void
    ): void;

    /**
     * Send a chat message via Streamer.bot
     * @param platform - The platform to send to (twitch/youtube)
     * @param message - The message content
     * @param options - Optional settings (bot account, internal)
     */
    sendMessage(
      platform: "twitch" | "youtube",
      message: string,
      options?: SendMessageOptions
    ): Promise<void>;
  }
}

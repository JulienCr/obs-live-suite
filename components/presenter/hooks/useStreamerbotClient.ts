"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StreamerbotClient } from "@streamerbot/client";
import {
  type ChatMessage,
  type StreamerbotConnectionSettings,
  StreamerbotConnectionStatus,
  StreamerbotErrorType,
  type StreamerbotConnectionError,
  normalizeTwitchChatMessage,
  type TwitchChatMessageEvent,
  normalizeTwitchFollowEvent,
  type TwitchFollowEvent,
  normalizeTwitchSubEvent,
  type TwitchSubEvent,
  normalizeTwitchReSubEvent,
  type TwitchReSubEvent,
  normalizeTwitchGiftSubEvent,
  type TwitchGiftSubEvent,
  normalizeTwitchRaidEvent,
  type TwitchRaidEvent,
  normalizeTwitchCheerEvent,
  type TwitchCheerEvent,
  normalizeYouTubeChatMessage,
  type YouTubeChatMessageEvent,
  normalizeYouTubeNewSponsor,
  type YouTubeNewSponsorEvent,
  normalizeYouTubeSuperChat,
  type YouTubeSuperChatEvent,
  normalizeYouTubeSuperSticker,
  type YouTubeSuperStickerEvent,
} from "@/lib/models/StreamerbotChat";

export interface UseStreamerbotClientOptions {
  settings: StreamerbotConnectionSettings | null;
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: StreamerbotConnectionError) => void;
}

export interface UseStreamerbotClientReturn {
  status: StreamerbotConnectionStatus;
  error: StreamerbotConnectionError | null;
  lastEventTime: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isUsingFallback: boolean;
  sendMessage: (message: string, platform?: "twitch" | "youtube") => Promise<boolean>;
  canSendMessages: boolean;
}

/**
 * React hook for managing Streamer.bot WebSocket connection
 * Uses @streamerbot/client library
 */
export function useStreamerbotClient({
  settings,
  onMessage,
  onError,
}: UseStreamerbotClientOptions): UseStreamerbotClientReturn {
  const [status, setStatus] = useState<StreamerbotConnectionStatus>(
    StreamerbotConnectionStatus.DISCONNECTED
  );
  const [error, setError] = useState<StreamerbotConnectionError | null>(null);
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);

  // Use refs for callbacks to avoid stale closures
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const clientRef = useRef<StreamerbotClient | null>(null);
  const mountedRef = useRef(true);
  const connectionIdRef = useRef(0); // Track current connection to handle StrictMode

  // Keep refs up to date
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
  }, [onMessage, onError]);

  const handleError = useCallback((errorInfo: StreamerbotConnectionError) => {
    if (!mountedRef.current) return;
    setError(errorInfo);
    setStatus(StreamerbotConnectionStatus.ERROR);
    onErrorRef.current?.(errorInfo);
  }, []);

  const disconnect = useCallback(() => {
    if (clientRef.current) {
      console.log("[Streamerbot] Disconnecting...");
      try {
        clientRef.current.disconnect();
      } catch {
        // Ignore disconnect errors
      }
      clientRef.current = null;
    }
    if (mountedRef.current) {
      setStatus(StreamerbotConnectionStatus.DISCONNECTED);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!settings) {
      handleError({
        type: StreamerbotErrorType.UNKNOWN,
        message: "No connection settings provided",
      });
      return;
    }

    // Clean up existing connection
    if (clientRef.current) {
      try {
        clientRef.current.disconnect();
      } catch {
        // Ignore
      }
      clientRef.current = null;
    }

    setError(null);
    setStatus(StreamerbotConnectionStatus.CONNECTING);

    // Increment connection ID to track this specific connection
    const thisConnectionId = ++connectionIdRef.current;

    const wsUrl = `${settings.scheme}://${settings.host}:${settings.port}${settings.endpoint}`;
    console.log(`[Streamerbot] Connecting to ${wsUrl} (connection #${thisConnectionId})`);

    try {
      const client = new StreamerbotClient({
        host: settings.host,
        port: settings.port,
        endpoint: settings.endpoint,
        scheme: settings.scheme,
        password: settings.password,
        immediate: false, // Don't connect immediately, we'll call connect() manually
        autoReconnect: settings.autoReconnect ?? true,
        retries: -1, // Infinite retries
        subscribe: {
          Twitch: ["ChatMessage", "Follow", "Sub", "ReSub", "GiftSub", "GiftBomb", "Raid", "Cheer"],
          YouTube: ["Message", "NewSponsor", "NewSubscriber", "SuperChat", "SuperSticker"],
        },
        onConnect: () => {
          // Ignore if this connection was superseded
          if (thisConnectionId !== connectionIdRef.current) return;
          console.log("[Streamerbot] Connected!");
          if (mountedRef.current) {
            setStatus(StreamerbotConnectionStatus.CONNECTED);
          }
        },
        onDisconnect: () => {
          // Ignore if this connection was superseded
          if (thisConnectionId !== connectionIdRef.current) return;
          console.log("[Streamerbot] Disconnected");
          if (mountedRef.current) {
            setStatus(StreamerbotConnectionStatus.DISCONNECTED);
          }
        },
        onError: (err) => {
          // Ignore if this connection was superseded
          if (thisConnectionId !== connectionIdRef.current) return;
          console.error("[Streamerbot] Error:", err);
          if (mountedRef.current) {
            handleError({
              type: StreamerbotErrorType.WEBSOCKET_ERROR,
              message: String(err) || "WebSocket error",
              originalError: err,
            });
          }
        },
      });

      // Register event handlers for Twitch events
      client.on("Twitch.ChatMessage", (data) => {
        if (thisConnectionId !== connectionIdRef.current || !mountedRef.current) return;
        try {
          const normalizedMessage = normalizeTwitchChatMessage(data as unknown as TwitchChatMessageEvent);
          setLastEventTime(Date.now());
          onMessageRef.current?.(normalizedMessage);
        } catch (err) {
          console.error("[Streamerbot] Error normalizing Twitch.ChatMessage:", err);
        }
      });

      client.on("Twitch.Follow", (data) => {
        if (thisConnectionId !== connectionIdRef.current || !mountedRef.current) return;
        try {
          const normalizedMessage = normalizeTwitchFollowEvent(data as unknown as TwitchFollowEvent);
          setLastEventTime(Date.now());
          onMessageRef.current?.(normalizedMessage);
        } catch (err) {
          console.error("[Streamerbot] Error normalizing Twitch.Follow:", err);
        }
      });

      client.on("Twitch.Sub", (data) => {
        if (thisConnectionId !== connectionIdRef.current || !mountedRef.current) return;
        try {
          const normalizedMessage = normalizeTwitchSubEvent(data as unknown as TwitchSubEvent);
          setLastEventTime(Date.now());
          onMessageRef.current?.(normalizedMessage);
        } catch (err) {
          console.error("[Streamerbot] Error normalizing Twitch.Sub:", err);
        }
      });

      client.on("Twitch.ReSub", (data) => {
        if (thisConnectionId !== connectionIdRef.current || !mountedRef.current) return;
        try {
          const normalizedMessage = normalizeTwitchReSubEvent(data as unknown as TwitchReSubEvent);
          setLastEventTime(Date.now());
          onMessageRef.current?.(normalizedMessage);
        } catch (err) {
          console.error("[Streamerbot] Error normalizing Twitch.ReSub:", err);
        }
      });

      client.on("Twitch.GiftSub", (data) => {
        if (thisConnectionId !== connectionIdRef.current || !mountedRef.current) return;
        try {
          const normalizedMessage = normalizeTwitchGiftSubEvent(data as unknown as TwitchGiftSubEvent);
          setLastEventTime(Date.now());
          onMessageRef.current?.(normalizedMessage);
        } catch (err) {
          console.error("[Streamerbot] Error normalizing Twitch.GiftSub:", err);
        }
      });

      client.on("Twitch.Raid", (data) => {
        if (thisConnectionId !== connectionIdRef.current || !mountedRef.current) return;
        try {
          const normalizedMessage = normalizeTwitchRaidEvent(data as unknown as TwitchRaidEvent);
          setLastEventTime(Date.now());
          onMessageRef.current?.(normalizedMessage);
        } catch (err) {
          console.error("[Streamerbot] Error normalizing Twitch.Raid:", err);
        }
      });

      client.on("Twitch.Cheer", (data) => {
        if (thisConnectionId !== connectionIdRef.current || !mountedRef.current) return;
        try {
          const normalizedMessage = normalizeTwitchCheerEvent(data as unknown as TwitchCheerEvent);
          setLastEventTime(Date.now());
          onMessageRef.current?.(normalizedMessage);
        } catch (err) {
          console.error("[Streamerbot] Error normalizing Twitch.Cheer:", err);
        }
      });

      // Register event handlers for YouTube events
      client.on("YouTube.Message", (data) => {
        if (thisConnectionId !== connectionIdRef.current || !mountedRef.current) return;
        try {
          const normalizedMessage = normalizeYouTubeChatMessage(data as unknown as YouTubeChatMessageEvent);
          setLastEventTime(Date.now());
          onMessageRef.current?.(normalizedMessage);
        } catch (err) {
          console.error("[Streamerbot] Error normalizing YouTube.Message:", err);
        }
      });

      client.on("YouTube.NewSponsor", (data) => {
        if (thisConnectionId !== connectionIdRef.current || !mountedRef.current) return;
        try {
          const normalizedMessage = normalizeYouTubeNewSponsor(data as unknown as YouTubeNewSponsorEvent);
          setLastEventTime(Date.now());
          onMessageRef.current?.(normalizedMessage);
        } catch (err) {
          console.error("[Streamerbot] Error normalizing YouTube.NewSponsor:", err);
        }
      });

      client.on("YouTube.SuperChat", (data) => {
        if (thisConnectionId !== connectionIdRef.current || !mountedRef.current) return;
        try {
          const normalizedMessage = normalizeYouTubeSuperChat(data as unknown as YouTubeSuperChatEvent);
          setLastEventTime(Date.now());
          onMessageRef.current?.(normalizedMessage);
        } catch (err) {
          console.error("[Streamerbot] Error normalizing YouTube.SuperChat:", err);
        }
      });

      client.on("YouTube.SuperSticker", (data) => {
        if (thisConnectionId !== connectionIdRef.current || !mountedRef.current) return;
        try {
          const normalizedMessage = normalizeYouTubeSuperSticker(data as unknown as YouTubeSuperStickerEvent);
          setLastEventTime(Date.now());
          onMessageRef.current?.(normalizedMessage);
        } catch (err) {
          console.error("[Streamerbot] Error normalizing YouTube.SuperSticker:", err);
        }
      });

      clientRef.current = client;

      // Now connect
      await client.connect();
    } catch (err) {
      // Ignore if this connection was superseded
      if (thisConnectionId !== connectionIdRef.current) return;
      console.error("[Streamerbot] Connection failed:", err);
      handleError({
        type: StreamerbotErrorType.CONNECTION_REFUSED,
        message: err instanceof Error ? err.message : String(err),
        originalError: err,
      });
    }
  }, [settings, handleError]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    mountedRef.current = true;

    if (settings?.autoConnect) {
      connect();
    }

    return () => {
      mountedRef.current = false;
      // Increment connection ID to invalidate any in-flight connection
      connectionIdRef.current++;
      if (clientRef.current) {
        try {
          clientRef.current.disconnect();
        } catch {
          // Ignore cleanup errors
        }
        clientRef.current = null;
      }
    };
  }, []); // Empty deps - only run on mount/unmount

  // Reconnect when settings change
  useEffect(() => {
    // Skip initial render
    if (!settings) return;

    // If we're connected and settings changed, reconnect
    if (clientRef.current && status === StreamerbotConnectionStatus.CONNECTED) {
      console.log("[Streamerbot] Settings changed, reconnecting...");
      disconnect();
      connect();
    }
  }, [settings?.host, settings?.port, settings?.endpoint, settings?.scheme, settings?.password]);

  // Send message function
  const sendMessage = useCallback(async (message: string, platform: "twitch" | "youtube" = "twitch"): Promise<boolean> => {
    if (!clientRef.current || status !== StreamerbotConnectionStatus.CONNECTED) {
      console.warn("[Streamerbot] Cannot send message - not connected");
      return false;
    }

    try {
      console.log(`[Streamerbot] Sending message to ${platform}:`, message);

      const client = clientRef.current as any;

      // Use the sendMessage method from @streamerbot/client
      // Signature: sendMessage(platform, message, options)
      if (typeof client.sendMessage === "function") {
        await client.sendMessage(platform, message, {
          bot: false,
          internal: false,
        });
        console.log("[Streamerbot] Message sent successfully");
        return true;
      } else {
        console.warn("[Streamerbot] sendMessage method not available on client");
        return false;
      }
    } catch (err) {
      console.error("[Streamerbot] Failed to send message:", err);
      return false;
    }
  }, [status]);

  const canSendMessages = status === StreamerbotConnectionStatus.CONNECTED;

  return {
    status,
    error,
    lastEventTime,
    connect,
    disconnect,
    isUsingFallback: false,
    sendMessage,
    canSendMessages,
  };
}

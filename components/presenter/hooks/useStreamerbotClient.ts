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
          Twitch: ["ChatMessage"],
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

      // Register event handler for chat messages
      client.on("Twitch.ChatMessage", (data) => {
        // Ignore if this connection was superseded
        if (thisConnectionId !== connectionIdRef.current || !mountedRef.current) return;
        console.log("[Streamerbot] Chat message received:", data);

        try {
          // The data from the client is the full event object
          const normalizedMessage = normalizeTwitchChatMessage(data as unknown as TwitchChatMessageEvent);
          setLastEventTime(Date.now());
          onMessageRef.current?.(normalizedMessage);
        } catch (err) {
          console.error("[Streamerbot] Error normalizing message:", err);
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

  return {
    status,
    error,
    lastEventTime,
    connect,
    disconnect,
    isUsingFallback: false,
  };
}

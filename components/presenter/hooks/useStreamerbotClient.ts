"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  type ChatMessage,
  type StreamerbotConnectionSettings,
  StreamerbotConnectionStatus,
  StreamerbotErrorType,
  type StreamerbotConnectionError,
  type StreamerbotGatewayMessage,
  type StreamerbotGatewayStatus,
} from "@/lib/models/StreamerbotChat";
import { getWebSocketUrl, getBackendUrl } from "@/lib/utils/websocket";
import { apiPost, apiGet, isClientFetchError } from "@/lib/utils/ClientFetch";

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
 * React hook for managing Streamerbot connection via backend gateway
 * Connects to WebSocket hub instead of directly to Streamer.bot
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
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

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

  // Connect to backend API
  const connect = useCallback(async () => {
    if (!settings) {
      handleError({
        type: StreamerbotErrorType.UNKNOWN,
        message: "No connection settings provided",
      });
      return;
    }

    setError(null);
    setStatus(StreamerbotConnectionStatus.CONNECTING);

    try {
      // Call backend API to connect
      await apiPost(`${getBackendUrl()}/api/streamerbot-chat/connect`, undefined);

      console.log("[Streamerbot] Gateway connection initiated");
      // Status will be updated via WebSocket messages
    } catch (err) {
      console.error("[Streamerbot] Failed to connect:", err);
      const errorMessage = isClientFetchError(err) ? err.errorMessage : String(err);
      handleError({
        type: StreamerbotErrorType.CONNECTION_REFUSED,
        message: errorMessage,
        originalError: err,
      });
    }
  }, [settings, handleError]);

  // Disconnect from backend API
  const disconnect = useCallback(() => {
    console.log("[Streamerbot] Disconnecting...");

    apiPost(`${getBackendUrl()}/api/streamerbot-chat/disconnect`, undefined).catch((err) => {
      console.error("[Streamerbot] Failed to disconnect:", err);
    });

    if (mountedRef.current) {
      setStatus(StreamerbotConnectionStatus.DISCONNECTED);
    }
  }, []);

  // Setup WebSocket connection to hub with retry
  useEffect(() => {
    mountedRef.current = true;
    let reconnectTimer: NodeJS.Timeout | null = null;
    let reconnectAttempt = 0;
    const maxReconnectAttempts = 10;

    const connectWebSocket = () => {
      // Connect to WebSocket hub
      const wsUrl = getWebSocketUrl();
      console.log(`[Streamerbot] Connecting to WebSocket hub at ${wsUrl} (attempt ${reconnectAttempt + 1}/${maxReconnectAttempts})`);

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("[Streamerbot] WebSocket connected, subscribing to streamerbot-chat channel");
        reconnectAttempt = 0; // Reset on successful connection

        // Subscribe to streamerbot-chat channel
        ws.send(JSON.stringify({ type: "subscribe", channel: "streamerbot-chat" }));

        // Request current status from backend
        apiGet<StreamerbotGatewayStatus>(`${getBackendUrl()}/api/streamerbot-chat/status`)
          .then((statusData) => {
            if (mountedRef.current) {
              setStatus(statusData.status);
              if (statusData.error) setError(statusData.error);
              if (statusData.lastEventTime) setLastEventTime(statusData.lastEventTime);
            }
          })
          .catch((err) => {
            console.error("[Streamerbot] Failed to fetch status:", err);
          });

        // Load chat history from database
        apiGet<{ messages: ChatMessage[]; count: number }>(`${getBackendUrl()}/api/streamerbot-chat/history`)
          .then((data) => {
            if (mountedRef.current && data.messages && data.messages.length > 0) {
              console.log(`[Streamerbot] Loaded ${data.count} historical messages`);
              // Add historical messages to the message buffer
              data.messages.forEach((msg) => {
                onMessageRef.current?.(msg);
              });
            }
          })
          .catch((err) => {
            console.error("[Streamerbot] Failed to fetch history:", err);
          });
      };

      ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Only handle messages for our channel
        if (message.channel !== "streamerbot-chat") return;

        // WebSocketHub wraps messages as: { channel, data }
        // Our data structure: { type, payload: StreamerbotGatewayMessage, timestamp }
        if (!message.data || !message.data.payload) {
          console.log("[Streamerbot] Ignoring message without payload");
          return;
        }

        const gatewayMessage: StreamerbotGatewayMessage = message.data.payload;

        // Validate gateway message
        if (!gatewayMessage.type || !gatewayMessage.payload) {
          console.warn("[Streamerbot] Invalid gateway message:", gatewayMessage);
          return;
        }

        switch (gatewayMessage.type) {
          case "message": {
            const chatMessage = gatewayMessage.payload as ChatMessage;
            setLastEventTime(Date.now());
            onMessageRef.current?.(chatMessage);
            break;
          }

          case "status": {
            const statusUpdate = gatewayMessage.payload as StreamerbotGatewayStatus;
            if (mountedRef.current) {
              setStatus(statusUpdate.status);
              if (statusUpdate.error) {
                setError(statusUpdate.error);
              } else {
                setError(null);
              }
              if (statusUpdate.lastEventTime) {
                setLastEventTime(statusUpdate.lastEventTime);
              }
            }
            break;
          }

          case "error": {
            const errorInfo = gatewayMessage.payload as StreamerbotConnectionError;
            handleError(errorInfo);
            break;
          }
        }
      } catch (err) {
        console.error("[Streamerbot] Error parsing WebSocket message:", err);
      }
      };

      ws.onerror = () => {
        console.warn("[Streamerbot] WebSocket error - backend may not be ready yet");
      };

      ws.onclose = (event) => {
        console.log(`[Streamerbot] WebSocket closed (code: ${event.code}, reason: ${event.reason || 'none'})`);

        // Attempt to reconnect if not at max attempts
        if (mountedRef.current && reconnectAttempt < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), 10000); // Exponential backoff, max 10s
          console.log(`[Streamerbot] Reconnecting in ${delay}ms...`);
          reconnectAttempt++;
          reconnectTimer = setTimeout(connectWebSocket, delay);
        } else if (reconnectAttempt >= maxReconnectAttempts) {
          console.error("[Streamerbot] Max reconnection attempts reached. Please refresh the page.");
        }
      };
    };

    // Start initial connection
    connectWebSocket();

    return () => {
      mountedRef.current = false;
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [handleError]); // Only run on mount/unmount

  // Send message function
  const sendMessage = useCallback(
    async (message: string, platform: "twitch" | "youtube" = "twitch"): Promise<boolean> => {
      if (status !== StreamerbotConnectionStatus.CONNECTED) {
        console.warn("[Streamerbot] Cannot send message - not connected");
        return false;
      }

      try {
        console.log(`[Streamerbot] Sending message to ${platform}:`, message);

        await apiPost(`${getBackendUrl()}/api/streamerbot-chat/send`, { platform, message });

        console.log("[Streamerbot] Message sent successfully");
        return true;
      } catch (err) {
        console.error("[Streamerbot] Failed to send message:", err);
        return false;
      }
    },
    [status]
  );

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

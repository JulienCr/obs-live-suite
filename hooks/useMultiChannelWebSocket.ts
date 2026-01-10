"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getWebSocketUrl } from "@/lib/utils/websocket";

/**
 * WebSocket message structure from the hub
 */
export interface WebSocketMessage<T = unknown> {
  channel: string;
  data: T;
}

/**
 * Options for multi-channel WebSocket connection
 */
export interface UseMultiChannelWebSocketOptions {
  /**
   * Channels to subscribe to
   */
  channels: string[];

  /**
   * Callback when a message is received on any subscribed channel
   */
  onMessage: (channel: string, data: unknown) => void;

  /**
   * Initial delay before connecting (avoids race conditions)
   * @default 500
   */
  connectionDelay?: number;

  /**
   * Delay before reconnection attempts
   * @default 3000
   */
  reconnectDelay?: number;

  /**
   * Logging prefix for debug messages
   * @default "MultiChannelWS"
   */
  logPrefix?: string;
}

/**
 * Return type for useMultiChannelWebSocket hook
 */
export interface UseMultiChannelWebSocketReturn {
  /**
   * Whether the WebSocket is currently connected
   */
  isConnected: boolean;

  /**
   * Send a message through the WebSocket
   */
  send: (data: unknown) => void;

  /**
   * Reference to the WebSocket instance
   */
  wsRef: React.RefObject<WebSocket | null>;
}

/**
 * Hook for managing WebSocket connections to multiple channels.
 *
 * This hook handles:
 * - WebSocket connection with configurable initial delay
 * - Subscription to multiple channels
 * - Automatic reconnection on disconnect
 * - Message routing by channel
 * - Proper cleanup on unmount
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { isConnected } = useMultiChannelWebSocket({
 *     channels: ["lower", "poster", "countdown"],
 *     onMessage: (channel, data) => {
 *       console.log(`[${channel}]`, data);
 *     },
 *   });
 *
 *   return <div>Connected: {isConnected ? "Yes" : "No"}</div>;
 * }
 * ```
 */
export function useMultiChannelWebSocket({
  channels,
  onMessage,
  connectionDelay = 500,
  reconnectDelay = 3000,
  logPrefix = "MultiChannelWS",
}: UseMultiChannelWebSocketOptions): UseMultiChannelWebSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);

  // Keep onMessage ref current to avoid stale closures
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const send = useCallback((data: unknown): void => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let isUnmounted = false;

    function connectWebSocket(): void {
      if (isUnmounted) return;

      try {
        const ws = new WebSocket(getWebSocketUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          // Subscribe to all channels
          channels.forEach((channel) => {
            ws.send(JSON.stringify({ type: "subscribe", channel }));
          });
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            const { channel, data } = message;

            if (data && channels.includes(channel)) {
              onMessageRef.current(channel, data);
            }
          } catch (error) {
            console.error(`[${logPrefix}] Parse error:`, error);
          }
        };

        ws.onerror = () => {
          // Silently handle, will reconnect
        };

        ws.onclose = () => {
          wsRef.current = null;
          setIsConnected(false);
          if (!isUnmounted) {
            reconnectTimeout = setTimeout(connectWebSocket, reconnectDelay);
          }
        };
      } catch (error) {
        console.error(`[${logPrefix}] Connection error:`, error);
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connectWebSocket, reconnectDelay);
        }
      }
    }

    // Delay initial connection slightly
    const initialTimeout = setTimeout(connectWebSocket, connectionDelay);

    return () => {
      isUnmounted = true;
      clearTimeout(initialTimeout);
      clearTimeout(reconnectTimeout);

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [channels.join(","), connectionDelay, reconnectDelay, logPrefix]);

  return {
    isConnected,
    send,
    wsRef,
  };
}

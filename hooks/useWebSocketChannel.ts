"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getWebSocketUrl } from "@/lib/utils/websocket";

/**
 * Connection state for the WebSocket channel
 */
export type ConnectionState = "disconnected" | "connecting" | "connected" | "reconnecting";

/**
 * Options for the useWebSocketChannel hook
 */
export interface UseWebSocketChannelOptions {
  /**
   * Whether the WebSocket connection should be active.
   * When false, the connection will be closed and no reconnection attempts will be made.
   * @default true
   */
  enabled?: boolean;

  /**
   * Initial delay for reconnection attempts in milliseconds.
   * @default 1000
   */
  initialReconnectDelay?: number;

  /**
   * Maximum delay for reconnection attempts in milliseconds.
   * @default 30000
   */
  maxReconnectDelay?: number;

  /**
   * Multiplier for exponential backoff.
   * @default 2
   */
  backoffMultiplier?: number;

  /**
   * Optional logging prefix for debug messages.
   * @default channel name
   */
  logPrefix?: string;
}

/**
 * Return type for the useWebSocketChannel hook
 */
export interface UseWebSocketChannelReturn {
  /**
   * Current connection state
   */
  connectionState: ConnectionState;

  /**
   * Whether the WebSocket is currently connected
   */
  isConnected: boolean;

  /**
   * Send a message through the WebSocket
   * @param data - Data to send (will be JSON stringified)
   */
  send: (data: unknown) => void;

  /**
   * Send an acknowledgment for a received event
   * @param eventId - The event ID to acknowledge
   * @param success - Whether the event was processed successfully
   */
  sendAck: (eventId: string, success?: boolean) => void;

  /**
   * Reference to the WebSocket instance (for advanced use cases)
   */
  wsRef: React.RefObject<WebSocket | null>;
}

/**
 * WebSocket message structure from the hub
 */
interface WebSocketMessage<T = unknown> {
  channel: string;
  data: T;
}

/**
 * Custom hook for managing WebSocket channel subscriptions.
 *
 * This hook handles:
 * - WebSocket connection establishment
 * - Channel subscription on connect
 * - Automatic reconnection with exponential backoff
 * - Message parsing with error handling
 * - Connection state tracking
 * - Proper cleanup on unmount
 *
 * @param channel - The channel to subscribe to (e.g., "lower", "countdown", "poster")
 * @param onMessage - Callback function called when a message is received on the channel
 * @param options - Optional configuration options
 * @returns Object containing connection state, send function, and WebSocket ref
 *
 * @example
 * ```tsx
 * function MyOverlay() {
 *   const { isConnected, sendAck } = useWebSocketChannel<MyPayload>(
 *     "my-channel",
 *     (data) => {
 *       console.log("Received:", data);
 *       // Handle the message...
 *     }
 *   );
 *
 *   return <div>Connected: {isConnected ? "Yes" : "No"}</div>;
 * }
 * ```
 */
export function useWebSocketChannel<T = unknown>(
  channel: string,
  onMessage: (data: T) => void,
  options: UseWebSocketChannelOptions = {}
): UseWebSocketChannelReturn {
  const {
    enabled = true,
    initialReconnectDelay = 1000,
    maxReconnectDelay = 30000,
    backoffMultiplier = 2,
    logPrefix = channel,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const reconnectDelayRef = useRef(initialReconnectDelay);
  const isMountedRef = useRef(true);
  const onMessageRef = useRef(onMessage);

  // Keep onMessage ref up to date to avoid stale closures
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  /**
   * Send a message through the WebSocket
   */
  const send = useCallback((data: unknown) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  /**
   * Send an acknowledgment for a received event
   */
  const sendAck = useCallback(
    (eventId: string, success = true) => {
      send({
        type: "ack",
        eventId,
        channel,
        success,
      });
    },
    [channel, send]
  );

  useEffect(() => {
    isMountedRef.current = true;

    // If not enabled, don't connect
    if (!enabled) {
      // Close existing connection if disabled
      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        try {
          wsRef.current.close(1000, "Hook disabled");
        } catch {
          // Ignore close errors
        }
      }
      setConnectionState("disconnected");
      return;
    }

    // Debounce timeout to avoid React Strict Mode double-connect
    let connectDebounceTimeout: NodeJS.Timeout | undefined;

    const connect = () => {
      // Don't create new connection if component is unmounting or disabled
      if (!isMountedRef.current || !enabled) return;

      // Close existing connection before creating new one
      if (
        wsRef.current &&
        (wsRef.current.readyState === WebSocket.OPEN ||
          wsRef.current.readyState === WebSocket.CONNECTING)
      ) {
        try {
          wsRef.current.close();
        } catch {
          // Ignore close errors
        }
      }

      setConnectionState("connecting");
      wsRef.current = new WebSocket(getWebSocketUrl());

      wsRef.current.onopen = () => {
        if (!isMountedRef.current) {
          wsRef.current?.close();
          return;
        }

        console.log(`[${logPrefix}] Connected to WebSocket`);
        setConnectionState("connected");

        // Reset reconnect delay on successful connection
        reconnectDelayRef.current = initialReconnectDelay;

        // Subscribe to the channel
        wsRef.current?.send(
          JSON.stringify({
            type: "subscribe",
            channel,
          })
        );
      };

      wsRef.current.onmessage = (event: MessageEvent) => {
        if (!isMountedRef.current) return;

        try {
          const message = JSON.parse(event.data) as WebSocketMessage<T>;

          // Only process messages for our channel
          if (message.channel === channel) {
            onMessageRef.current(message.data);
          }
        } catch (error) {
          console.error(`[${logPrefix}] Failed to parse message:`, error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error(`[${logPrefix}] WebSocket error:`, error);
      };

      wsRef.current.onclose = (event) => {
        // Only auto-reconnect on unexpected disconnections
        // Code 1000 = normal closure, 1001 = going away (page navigation)
        if (isMountedRef.current && event.code !== 1000 && event.code !== 1001) {
          console.log(
            `[${logPrefix}] WebSocket closed unexpectedly (code ${event.code}), reconnecting in ${reconnectDelayRef.current}ms...`
          );

          setConnectionState("reconnecting");

          // Schedule reconnection with exponential backoff
          reconnectTimeoutRef.current = setTimeout(() => {
            // Calculate next delay with exponential backoff
            reconnectDelayRef.current = Math.min(
              reconnectDelayRef.current * backoffMultiplier,
              maxReconnectDelay
            );
            connect();
          }, reconnectDelayRef.current);
        } else {
          console.log(`[${logPrefix}] WebSocket closed normally`);
          setConnectionState("disconnected");
        }
      };
    };

    // Debounce connection to handle React Strict Mode double-mount
    connectDebounceTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        connect();
      }
    }, 50);

    return () => {
      isMountedRef.current = false;
      clearTimeout(connectDebounceTimeout);
      clearTimeout(reconnectTimeoutRef.current);

      if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        try {
          wsRef.current.close(1000, "Component unmounting");
        } catch {
          // Ignore close errors during cleanup
        }
      }
    };
  }, [
    channel,
    enabled,
    initialReconnectDelay,
    maxReconnectDelay,
    backoffMultiplier,
    logPrefix,
  ]);

  return {
    connectionState,
    isConnected: connectionState === "connected",
    send,
    sendAck,
    wsRef,
  };
}

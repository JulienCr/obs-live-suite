"use client";

import {
  useWebSocketChannel,
  UseWebSocketChannelOptions,
  UseMultiChannelWebSocketReturn as BaseMultiChannelReturn,
} from "./useWebSocketChannel";

/**
 * WebSocket message structure from the hub
 * @deprecated Import from useWebSocketChannel instead
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
   * @deprecated This option is no longer used. The hook now uses a 50ms debounce.
   */
  connectionDelay?: number;

  /**
   * Delay before reconnection attempts
   * @default 3000
   * @deprecated Use initialReconnectDelay instead. The hook now uses exponential backoff.
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
 * This is a thin wrapper around useWebSocketChannel for backward compatibility.
 * Consider using useWebSocketChannel directly with an array of channels.
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
 *
 * @see useWebSocketChannel - The underlying hook that handles all WebSocket logic
 */
export function useMultiChannelWebSocket({
  channels,
  onMessage,
  reconnectDelay,
  logPrefix = "MultiChannelWS",
}: UseMultiChannelWebSocketOptions): UseMultiChannelWebSocketReturn {
  // Map old options to new format
  const options: UseWebSocketChannelOptions = {
    logPrefix,
    // Map reconnectDelay to initialReconnectDelay if provided (backward compat)
    ...(reconnectDelay !== undefined && { initialReconnectDelay: reconnectDelay }),
  };

  const result: BaseMultiChannelReturn = useWebSocketChannel(channels, onMessage, options);

  // Return only the fields from the original interface for backward compatibility
  return {
    isConnected: result.isConnected,
    send: result.send,
    wsRef: result.wsRef,
  };
}

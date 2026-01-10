"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { getWebSocketUrl } from "@/lib/utils/websocket";

/**
 * Overlay channel types that can be tracked
 */
export type OverlayChannel =
  | "lower"
  | "poster"
  | "poster-bigpicture"
  | "countdown"
  | "chat-highlight";

/**
 * State for each overlay type
 */
export interface OverlayActiveState {
  lowerThird: {
    active: boolean;
    guestId?: string;
    contentType?: "guest" | "text";
  };
  poster: {
    active: boolean;
    posterId?: string;
    displayMode?: "left" | "right" | "bigpicture";
  };
  countdown: {
    active: boolean;
  };
  chatHighlight: {
    active: boolean;
    messageId?: string;
    username?: string;
  };
}

/**
 * Initial state for all overlays
 */
const initialState: OverlayActiveState = {
  lowerThird: { active: false },
  poster: { active: false },
  countdown: { active: false },
  chatHighlight: { active: false },
};

/**
 * Shared hook to track overlay active state by subscribing to WebSocket channels.
 * This hook monitors all overlay channels and maintains a synchronized state
 * that can be used by dashboard panels to show accurate active indicators.
 *
 * The hook listens for "show" and "hide" events and also handles auto-hide
 * when a duration is specified in the payload.
 *
 * @returns OverlayActiveState - Current state of all overlay types
 *
 * @example
 * ```tsx
 * function PosterPanel() {
 *   const overlayState = useOverlayActiveState();
 *   const isActive = overlayState.poster.active;
 *
 *   return (
 *     <div className={isActive ? "border-green-500" : "border-gray-300"}>
 *       {isActive && <Badge>Active</Badge>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useOverlayActiveState(): OverlayActiveState {
  const wsRef = useRef<WebSocket | null>(null);
  const timeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [state, setState] = useState<OverlayActiveState>(initialState);

  // Clear a specific timeout
  const clearTimeoutFor = useCallback((key: string) => {
    const timeout = timeoutsRef.current.get(key);
    if (timeout) {
      clearTimeout(timeout);
      timeoutsRef.current.delete(key);
    }
  }, []);

  // Set a timeout for auto-hide
  const setTimeoutFor = useCallback(
    (key: string, duration: number, callback: () => void) => {
      clearTimeoutFor(key);
      const timeout = setTimeout(() => {
        callback();
        timeoutsRef.current.delete(key);
      }, duration * 1000);
      timeoutsRef.current.set(key, timeout);
    },
    [clearTimeoutFor]
  );

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;

      try {
        const ws = new WebSocket(getWebSocketUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          // Subscribe to all overlay channels
          const channels: OverlayChannel[] = [
            "lower",
            "poster",
            "poster-bigpicture",
            "countdown",
            "chat-highlight",
          ];
          channels.forEach((channel) => {
            ws.send(JSON.stringify({ type: "subscribe", channel }));
          });
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            const { channel, data } = message;

            if (!data) return;

            // Handle lower third events
            if (channel === "lower") {
              clearTimeoutFor("lowerThird");

              if (data.type === "show") {
                setState((prev) => ({
                  ...prev,
                  lowerThird: {
                    active: true,
                    guestId: data.payload?.guestId,
                    contentType: data.payload?.contentType,
                  },
                }));

                if (data.payload?.duration) {
                  setTimeoutFor("lowerThird", data.payload.duration, () => {
                    setState((prev) => ({
                      ...prev,
                      lowerThird: { active: false },
                    }));
                  });
                }
              } else if (data.type === "hide") {
                setState((prev) => ({
                  ...prev,
                  lowerThird: { active: false },
                }));
              }
            }

            // Handle poster events (both channels)
            if (channel === "poster" || channel === "poster-bigpicture") {
              clearTimeoutFor("poster");

              if (data.type === "show") {
                setState((prev) => ({
                  ...prev,
                  poster: {
                    active: true,
                    posterId: data.payload?.posterId,
                    displayMode:
                      channel === "poster-bigpicture"
                        ? "bigpicture"
                        : data.payload?.side,
                  },
                }));

                if (data.payload?.duration) {
                  setTimeoutFor("poster", data.payload.duration, () => {
                    setState((prev) => ({
                      ...prev,
                      poster: { active: false },
                    }));
                  });
                }
              } else if (data.type === "hide") {
                setState((prev) => ({
                  ...prev,
                  poster: { active: false },
                }));
              }
            }

            // Handle countdown events
            if (channel === "countdown") {
              clearTimeoutFor("countdown");

              if (data.type === "start" || data.type === "resume") {
                setState((prev) => ({
                  ...prev,
                  countdown: { active: true },
                }));
              } else if (
                data.type === "hide" ||
                data.type === "reset" ||
                data.type === "complete"
              ) {
                setState((prev) => ({
                  ...prev,
                  countdown: { active: false },
                }));
              }
            }

            // Handle chat highlight events
            if (channel === "chat-highlight") {
              clearTimeoutFor("chatHighlight");

              if (data.type === "show") {
                setState((prev) => ({
                  ...prev,
                  chatHighlight: {
                    active: true,
                    messageId: data.payload?.messageId,
                    username: data.payload?.username || data.payload?.displayName,
                  },
                }));

                if (data.payload?.duration) {
                  setTimeoutFor("chatHighlight", data.payload.duration, () => {
                    setState((prev) => ({
                      ...prev,
                      chatHighlight: { active: false },
                    }));
                  });
                }
              } else if (data.type === "hide") {
                setState((prev) => ({
                  ...prev,
                  chatHighlight: { active: false },
                }));
              }
            }
          } catch (error) {
            console.error("[useOverlayActiveState] Parse error:", error);
          }
        };

        ws.onerror = () => {
          // Silently handle, will reconnect
        };

        ws.onclose = () => {
          wsRef.current = null;
          if (!isUnmounted) {
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };
      } catch (error) {
        console.error("[useOverlayActiveState] Connection error:", error);
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    // Delay initial connection slightly to avoid race conditions
    const initialTimeout = setTimeout(connectWebSocket, 500);

    // Capture refs for cleanup
    const timeouts = timeoutsRef.current;
    const ws = wsRef.current;

    return () => {
      isUnmounted = true;
      clearTimeout(initialTimeout);
      clearTimeout(reconnectTimeout);

      // Clear all overlay state timeouts
      timeouts.forEach((timeout) => clearTimeout(timeout));
      timeouts.clear();

      if (ws && ws.readyState !== WebSocket.CLOSED) {
        ws.close();
      }
      wsRef.current = null;
    };
  }, [clearTimeoutFor, setTimeoutFor]);

  return state;
}

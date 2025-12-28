"use client";

import { useEffect, useState, useRef } from "react";
import { getWebSocketUrl } from "@/lib/utils/websocket";

export interface OverlayState {
  lowerThird: {
    active: boolean;
    guestId?: string;
    contentType?: "guest" | "freetext";
  };
  poster: {
    active: boolean;
    posterId?: string;
    displayMode?: "left" | "right" | "bigpicture";
  };
}

/**
 * Hook to track overlay state by subscribing to WebSocket channels
 * Monitors "lower" and "poster" channels to know what's currently on screen
 */
export function useOverlayState(): OverlayState {
  const wsRef = useRef<WebSocket | null>(null);
  const lowerThirdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const posterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [overlayState, setOverlayState] = useState<OverlayState>({
    lowerThird: { active: false },
    poster: { active: false },
  });

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;

      try {
        const ws = new WebSocket(getWebSocketUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          // Subscribe to overlay channels
          ws.send(JSON.stringify({ type: "subscribe", channel: "lower" }));
          ws.send(JSON.stringify({ type: "subscribe", channel: "poster" }));
          ws.send(JSON.stringify({ type: "subscribe", channel: "poster-bigpicture" }));
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);

            // Track lower third state
            if (message.channel === "lower" && message.data) {
              const data = message.data;

              // Clear any existing hide timeout
              if (lowerThirdTimeoutRef.current) {
                clearTimeout(lowerThirdTimeoutRef.current);
                lowerThirdTimeoutRef.current = null;
              }

              if (data.type === "show") {
                setOverlayState((prev) => ({
                  ...prev,
                  lowerThird: {
                    active: true,
                    guestId: data.payload?.guestId,
                    contentType: data.payload?.contentType,
                  },
                }));

                // If there's a duration, automatically clear the active state after that duration
                if (data.payload?.duration) {
                  lowerThirdTimeoutRef.current = setTimeout(() => {
                    setOverlayState((prev) => ({
                      ...prev,
                      lowerThird: { active: false },
                    }));
                    lowerThirdTimeoutRef.current = null;
                  }, data.payload.duration * 1000);
                }
              } else if (data.type === "hide") {
                setOverlayState((prev) => ({
                  ...prev,
                  lowerThird: { active: false },
                }));
              }
            }

            // Track poster state (both "poster" and "poster-bigpicture" channels)
            if ((message.channel === "poster" || message.channel === "poster-bigpicture") && message.data) {
              const data = message.data;

              // Clear any existing hide timeout
              if (posterTimeoutRef.current) {
                clearTimeout(posterTimeoutRef.current);
                posterTimeoutRef.current = null;
              }

              if (data.type === "show") {
                setOverlayState((prev) => ({
                  ...prev,
                  poster: {
                    active: true,
                    posterId: data.payload?.posterId,
                    displayMode: message.channel === "poster-bigpicture" ? "bigpicture" : data.payload?.side,
                  },
                }));

                // If there's a duration, automatically clear the active state after that duration
                if (data.payload?.duration) {
                  posterTimeoutRef.current = setTimeout(() => {
                    setOverlayState((prev) => ({
                      ...prev,
                      poster: { active: false },
                    }));
                    posterTimeoutRef.current = null;
                  }, data.payload.duration * 1000);
                }
              } else if (data.type === "hide") {
                setOverlayState((prev) => ({
                  ...prev,
                  poster: { active: false },
                }));
              }
            }
          } catch (error) {
            console.error("[useOverlayState] Parse error:", error);
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
        console.error("[useOverlayState] Connection error:", error);
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    // Delay initial connection slightly to avoid race conditions
    const initialTimeout = setTimeout(connectWebSocket, 500);

    return () => {
      isUnmounted = true;
      clearTimeout(initialTimeout);
      clearTimeout(reconnectTimeout);

      // Clear overlay state timeouts
      if (lowerThirdTimeoutRef.current) {
        clearTimeout(lowerThirdTimeoutRef.current);
        lowerThirdTimeoutRef.current = null;
      }
      if (posterTimeoutRef.current) {
        clearTimeout(posterTimeoutRef.current);
        posterTimeoutRef.current = null;
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return overlayState;
}

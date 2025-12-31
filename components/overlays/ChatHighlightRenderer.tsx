"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ChatHighlightShowPayload } from "@/lib/models/OverlayEvents";
import { ChatHighlightDisplay } from "./ChatHighlightDisplay";
import { getWebSocketUrl } from "@/lib/utils/websocket";

interface ChatHighlightTheme {
  colors: {
    primary: string;
    accent: string;
    surface: string;
    text: string;
  };
  font: {
    family: string;
    size: number;
    weight: number;
  };
}

interface ChatHighlightState {
  visible: boolean;
  animating: boolean;
  messageId?: string;
  platform: "twitch" | "youtube" | "trovo";
  username?: string;
  displayName?: string;
  message?: string;
  parts?: ChatHighlightShowPayload["parts"];
  metadata?: ChatHighlightShowPayload["metadata"];
  side: "left" | "right" | "center";
  theme?: ChatHighlightTheme;
}

/**
 * ChatHighlightRenderer manages WebSocket connection and state for chat highlight overlay
 */
export function ChatHighlightRenderer() {
  const [state, setState] = useState<ChatHighlightState>({
    visible: false,
    animating: false,
    platform: "twitch",
    side: "center",
  });

  const ws = useRef<WebSocket | null>(null);
  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleEvent = useCallback((data: { type: string; payload?: ChatHighlightShowPayload; id: string }) => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }

    switch (data.type) {
      case "show":
        if (data.payload) {
          console.log("[ChatHighlight] Received show payload:", data.payload.displayName);

          setState({
            visible: true,
            animating: true,
            messageId: data.payload.messageId,
            platform: data.payload.platform,
            username: data.payload.username,
            displayName: data.payload.displayName,
            message: data.payload.message,
            parts: data.payload.parts,
            metadata: data.payload.metadata,
            side: data.payload.side || "center",
            theme: data.payload.theme,
          });

          // Auto-hide after duration
          const duration = data.payload.duration || 10;
          hideTimeout.current = setTimeout(() => {
            setState((prev) => ({ ...prev, animating: false }));
            // Wait for animation to complete before hiding
            setTimeout(() => {
              setState((prev) => ({ ...prev, visible: false }));
            }, 500);
          }, duration * 1000);
        }
        break;

      case "hide":
        setState((prev) => ({ ...prev, animating: false }));
        setTimeout(() => {
          setState((prev) => ({ ...prev, visible: false }));
        }, 500);
        break;
    }

    // Send acknowledgment
    if (ws.current) {
      ws.current.send(
        JSON.stringify({
          type: "ack",
          eventId: data.id,
          channel: "chat-highlight",
          success: true,
        })
      );
    }
  }, []);

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let isMounted = true;

    const connect = () => {
      if (!isMounted) return;

      // Close existing connection before creating new one
      if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
        try {
          ws.current.close();
        } catch {
          // Ignore close errors
        }
      }

      ws.current = new WebSocket(getWebSocketUrl());

      ws.current.onopen = () => {
        if (!isMounted) {
          ws.current?.close();
          return;
        }
        console.log("[ChatHighlight] Connected to WebSocket");
        ws.current?.send(
          JSON.stringify({
            type: "subscribe",
            channel: "chat-highlight",
          })
        );
      };

      ws.current.onmessage = (event: MessageEvent) => {
        if (!isMounted) return;
        try {
          const message = JSON.parse(event.data);
          if (message.channel === "chat-highlight") {
            handleEvent(message.data);
          }
        } catch (error) {
          console.error("[ChatHighlight] Failed to parse message:", error);
        }
      };

      ws.current.onerror = (error) => {
        console.error("[ChatHighlight] WebSocket error:", error);
      };

      ws.current.onclose = (event) => {
        if (isMounted && event.code !== 1000 && event.code !== 1001) {
          console.log("[ChatHighlight] WebSocket closed unexpectedly, reconnecting in 3s...");
          reconnectTimeout = setTimeout(() => {
            connect();
          }, 3000);
        } else {
          console.log("[ChatHighlight] WebSocket closed normally");
        }
      };
    };

    connect();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        try {
          ws.current.close(1000, "Component unmounting");
        } catch {
          // Ignore close errors during cleanup
        }
      }
    };
  }, [handleEvent]);

  if (!state.visible) {
    return null;
  }

  return (
    <ChatHighlightDisplay
      displayName={state.displayName || ""}
      message={state.message || ""}
      parts={state.parts}
      platform={state.platform}
      metadata={state.metadata}
      side={state.side}
      theme={state.theme}
      animating={state.animating}
      isPreview={false}
    />
  );
}

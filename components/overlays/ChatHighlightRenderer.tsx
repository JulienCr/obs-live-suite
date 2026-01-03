"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { ChatHighlightShowPayload } from "@/lib/models/OverlayEvents";
import { ChatHighlightDisplay } from "./ChatHighlightDisplay";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";

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

interface ChatHighlightEvent {
  type: string;
  payload?: ChatHighlightShowPayload;
  id: string;
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

  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const sendAckRef = useRef<(eventId: string, success?: boolean) => void>(() => {});

  const handleEvent = useCallback((data: ChatHighlightEvent) => {
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

          // Auto-hide after duration (if duration > 0)
          // duration=0 means auto-hide is disabled - stay visible until manual hide
          const duration = data.payload.duration;
          if (duration && duration > 0) {
            hideTimeout.current = setTimeout(() => {
              setState((prev) => ({ ...prev, animating: false }));
              // Wait for animation to complete before hiding
              setTimeout(() => {
                setState((prev) => ({ ...prev, visible: false }));
              }, 500);
            }, duration * 1000);
          }
          // If duration is 0 or undefined/null, no auto-hide timeout is set
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
    sendAckRef.current(data.id);
  }, []);

  const { sendAck } = useWebSocketChannel<ChatHighlightEvent>(
    "chat-highlight",
    handleEvent,
    { logPrefix: "ChatHighlight" }
  );

  // Keep sendAck ref updated to avoid stale closure in handleEvent
  useEffect(() => {
    sendAckRef.current = sendAck;
  }, [sendAck]);

  // Cleanup hide timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
    };
  }, []);

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

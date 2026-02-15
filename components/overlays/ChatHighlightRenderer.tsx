"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { ChatHighlightShowPayload } from "@/lib/models/OverlayEvents";
import { ChatHighlightDisplay } from "./ChatHighlightDisplay";
import { OverlayMotionProvider } from "./OverlayMotionProvider";
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
 * ChatHighlightRenderer manages WebSocket connection and state for chat highlight overlay.
 * Uses Framer Motion AnimatePresence for smooth enter/exit animations.
 */
export function ChatHighlightRenderer() {
  const [state, setState] = useState<ChatHighlightState>({
    visible: false,
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
          setState({
            visible: true,
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

          // Auto-hide after duration; duration=0 or absent means stay visible until manual hide
          if (data.payload.duration) {
            hideTimeout.current = setTimeout(() => {
              setState((prev) => ({ ...prev, visible: false }));
            }, data.payload.duration * 1000);
          }
        }
        break;

      case "hide":
        setState((prev) => ({ ...prev, visible: false }));
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

  // Keep sendAck ref in sync
  sendAckRef.current = sendAck;

  // Cleanup hide timeout on unmount
  useEffect(() => {
    return () => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
    };
  }, []);

  return (
    <OverlayMotionProvider>
      <AnimatePresence>
        {state.visible && (
          <ChatHighlightDisplay
            key={state.messageId || "chat-highlight"}
            displayName={state.displayName || ""}
            message={state.message || ""}
            parts={state.parts}
            platform={state.platform}
            metadata={state.metadata}
            side={state.side}
            theme={state.theme}
            isPreview={false}
          />
        )}
      </AnimatePresence>
    </OverlayMotionProvider>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import type { CueMessage, CueAction } from "@/lib/models/Cue";
import type { PresenterPresence } from "@/lib/models/PresenterChannel";
import { getWebSocketUrl } from "@/lib/utils/websocket";

interface UsePresenterWebSocketReturn {
  connected: boolean;
  messages: CueMessage[];
  pinnedMessages: CueMessage[];
  presence: PresenterPresence[];
  sendAction: (messageId: string, action: CueAction) => void;
  sendReply: (text: string) => void;
  clearHistory: () => Promise<void>;
}

/**
 * Hook for presenter WebSocket connection using simplified single-channel system
 */
export function usePresenterWebSocket(
  role: "presenter" | "control" | "producer"
): UsePresenterWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clientIdRef = useRef<string>("");

  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<CueMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<CueMessage[]>([]);
  const [presence, setPresence] = useState<PresenterPresence[]>([]);
  const [seenMessageIds] = useState<Set<string>>(new Set());

  // Generate client ID
  useEffect(() => {
    clientIdRef.current = uuidv4();
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = getWebSocketUrl();
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      console.log("[Presenter WS] Connected");

      // Join presenter channel
      ws.send(JSON.stringify({
        type: "join-presenter",
        role,
        clientId: clientIdRef.current,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // Handle different message types
        switch (data.type) {
          case "replay":
            // Initial replay of messages on join
            if (data.messages) {
              const newMessages = data.messages.filter(
                (m: CueMessage) => !seenMessageIds.has(m.id)
              );
              newMessages.forEach((m: CueMessage) => seenMessageIds.add(m.id));
              setMessages(newMessages);
            }
            if (data.pinnedMessages) {
              setPinnedMessages(data.pinnedMessages);
            }
            if (data.presence) {
              setPresence(data.presence);
            }
            break;

          case "presence":
            // Presence update
            if (data.presence) {
              setPresence(data.presence);
            }
            break;

          default:
            // Presenter channel event (check if it's a presenter channel message)
            if (data.channel === "presenter") {
              const presenterData = data.data;

              if (presenterData.type === "message") {
                // Check if it's a clear event
                if (presenterData.payload?.type === "clear") {
                  // Clear all messages
                  setMessages([]);
                  setPinnedMessages([]);
                  seenMessageIds.clear();
                } else {
                  // Normal message
                  const message = presenterData.payload as CueMessage;
                  if (!seenMessageIds.has(message.id)) {
                    seenMessageIds.add(message.id);
                    setMessages(prev => [message, ...prev]);
                    if (message.pinned) {
                      setPinnedMessages(prev => [message, ...prev]);
                    }
                  }
                }
              } else if (presenterData.type === "action") {
                // Action on message (update state)
                const { messageId, message: updatedMessage, deleted } = presenterData.payload;

                if (deleted) {
                  // Message was deleted - remove from lists
                  setMessages(prev => prev.filter(m => m.id !== messageId));
                  setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
                  seenMessageIds.delete(messageId);
                } else {
                  setMessages(prev => prev.map(m =>
                    m.id === messageId ? updatedMessage : m
                  ));

                  // Update pinned messages
                  if (updatedMessage.pinned) {
                    setPinnedMessages(prev => {
                      const exists = prev.some(m => m.id === messageId);
                      if (exists) {
                        return prev.map(m => m.id === messageId ? updatedMessage : m);
                      }
                      return [updatedMessage, ...prev];
                    });
                  } else {
                    setPinnedMessages(prev => prev.filter(m => m.id !== messageId));
                  }
                }
              } else if (presenterData.type === "presence") {
                setPresence(presenterData.presence || []);
              }
            }
        }
      } catch (error) {
        console.error("[Presenter WS] Failed to parse message:", error);
      }
    };

    ws.onclose = (event) => {
      setConnected(false);
      console.log("[Presenter WS] Disconnected:", event.code, event.reason);

      // Reconnect on unexpected close
      if (event.code !== 1000 && event.code !== 1001) {
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log("[Presenter WS] Reconnecting...");
          connect();
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error("[Presenter WS] Error:", error);
    };

    wsRef.current = ws;
  }, [role, seenMessageIds]);

  // Setup WebSocket connection
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, "Component unmounting");
        wsRef.current = null;
      }
    };
  }, [connect]);

  // Send action on a message
  const sendAction = useCallback(async (messageId: string, action: CueAction) => {
    try {
      const response = await fetch(`/api/presenter/cue/${messageId}/action`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          clientId: clientIdRef.current,
        }),
      });

      if (!response.ok) {
        console.error("[Presenter] Action failed:", await response.text());
      }
    } catch (error) {
      console.error("[Presenter] Failed to send action:", error);
    }
  }, []);

  // Send a reply message
  const sendReply = useCallback(async (text: string) => {
    try {
      const response = await fetch("/api/presenter/cue/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "reply",
          from: role,
          body: text,
        }),
      });

      if (!response.ok) {
        console.error("[Presenter] Reply failed:", await response.text());
      }
    } catch (error) {
      console.error("[Presenter] Failed to send reply:", error);
    }
  }, [role]);

  // Clear message history
  const clearHistory = useCallback(async () => {
    try {
      const response = await fetch("/api/presenter/cue/clear", {
        method: "DELETE",
      });

      if (!response.ok) {
        console.error("[Presenter] Clear history failed:", await response.text());
      }
    } catch (error) {
      console.error("[Presenter] Failed to clear history:", error);
    }
  }, []);

  return {
    connected,
    messages,
    pinnedMessages,
    presence,
    sendAction,
    sendReply,
    clearHistory,
  };
}

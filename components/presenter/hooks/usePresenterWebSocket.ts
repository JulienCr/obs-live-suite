"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { CueMessage, CueAction } from "@/lib/models/Cue";
import type { RoomPresence } from "@/lib/models/Room";
import { getWebSocketUrl } from "@/lib/utils/websocket";

interface UsePresenterWebSocketReturn {
  connected: boolean;
  messages: CueMessage[];
  pinnedMessages: CueMessage[];
  presence: RoomPresence[];
  sendAction: (messageId: string, action: CueAction) => void;
  sendReply: (text: string) => void;
  clearHistory: () => Promise<void>;
}

export function usePresenterWebSocket(
  roomId: string,
  role: "presenter" | "control" | "producer"
): UsePresenterWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const clientIdRef = useRef<string>("");

  const [connected, setConnected] = useState(false);
  const [messages, setMessages] = useState<CueMessage[]>([]);
  const [pinnedMessages, setPinnedMessages] = useState<CueMessage[]>([]);
  const [presence, setPresence] = useState<RoomPresence[]>([]);
  const [seenMessageIds] = useState<Set<string>>(new Set());

  // Generate client ID
  useEffect(() => {
    clientIdRef.current = crypto.randomUUID();
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const wsUrl = getWebSocketUrl(3003);
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      console.log("[Presenter WS] Connected");

      // Join room
      ws.send(JSON.stringify({
        type: "join-room",
        roomId,
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
            // Room event (check if it's a room channel message)
            if (data.channel?.startsWith("room:")) {
              const roomData = data.data;

              if (roomData.type === "message") {
                // Check if it's a clear event
                if (roomData.payload?.type === "clear") {
                  // Clear all messages
                  setMessages([]);
                  setPinnedMessages([]);
                  seenMessageIds.clear();
                } else {
                  // Normal message
                  const message = roomData.payload as CueMessage;
                  if (!seenMessageIds.has(message.id)) {
                    seenMessageIds.add(message.id);
                    setMessages(prev => [message, ...prev]);
                    if (message.pinned) {
                      setPinnedMessages(prev => [message, ...prev]);
                    }
                  }
                }
              } else if (roomData.type === "action") {
                // Action on message (update state)
                const { messageId, message: updatedMessage } = roomData.payload;

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
              } else if (roomData.type === "presence") {
                setPresence(roomData.presence || []);
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
  }, [roomId, role, seenMessageIds]);

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
          roomId,
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
  }, [roomId, role]);

  // Clear message history
  const clearHistory = useCallback(async () => {
    try {
      const response = await fetch(`/api/presenter/rooms/${roomId}/clear`, {
        method: "DELETE",
      });

      if (!response.ok) {
        console.error("[Presenter] Clear history failed:", await response.text());
      }
    } catch (error) {
      console.error("[Presenter] Failed to clear history:", error);
    }
  }, [roomId]);

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

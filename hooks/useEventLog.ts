"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getWebSocketUrl } from "@/lib/utils/websocket";
import {
  EventLogEntry,
  EventLogType,
  EventLogFilter,
  StoredEventLog,
} from "@/lib/models/EventLog";
import { EventSource } from "@/lib/models/OverlayEvents";

const STORAGE_KEY = "obs-live-suite-event-log";
const STORAGE_VERSION = 1;
const MAX_EVENTS = 100;

interface UseEventLogReturn {
  events: EventLogEntry[];
  filteredEvents: EventLogEntry[];
  filter: EventLogFilter;
  setFilter: (filter: EventLogFilter) => void;
  clearAll: () => void;
  removeEvent: (id: string) => void;
  stopOverlay: (entry: EventLogEntry) => Promise<void>;
  replayOverlay: (entry: EventLogEntry) => Promise<void>;
  isConnected: boolean;
}

function loadFromStorage(): EventLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed: StoredEventLog = JSON.parse(stored);
    if (parsed.version !== STORAGE_VERSION) return [];
    return parsed.events || [];
  } catch {
    return [];
  }
}

function saveToStorage(events: EventLogEntry[]): void {
  if (typeof window === "undefined") return;
  try {
    const data: StoredEventLog = {
      version: STORAGE_VERSION,
      events,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("[EventLog] Failed to save:", error);
  }
}

function truncateMessage(message: string, maxLen: number): string {
  if (message.length <= maxLen) return message;
  return message.substring(0, maxLen - 3) + "...";
}

function getEndpointForChannel(channel: string): string {
  switch (channel) {
    case "lower":
      return "/api/overlays/lower";
    case "poster":
      return "/api/overlays/poster";
    case "poster-bigpicture":
      return "/api/overlays/poster-bigpicture";
    case "chat-highlight":
      return "/api/overlays/chat-highlight";
    default:
      return "/api/overlays/lower";
  }
}

export function useEventLog(): UseEventLogReturn {
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [filter, setFilter] = useState<EventLogFilter>("all");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const hideTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  // Track event IDs being replayed to avoid creating duplicates
  const replayingEventRef = useRef<{
    id: string;
    channel: string;
    timestamp: number;
  } | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored.length > 0) {
      // Clear any stale active states on load
      const cleaned = stored.map((e) => ({ ...e, isActive: false }));
      setEvents(cleaned);
    }
    setIsLoaded(true);
  }, []);

  // Save to localStorage when events change
  useEffect(() => {
    if (isLoaded) {
      saveToStorage(events);
    }
  }, [events, isLoaded]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      hideTimeoutsRef.current.forEach((t) => clearTimeout(t));
    };
  }, []);

  // Add event helper
  const addEvent = useCallback((entry: EventLogEntry) => {
    setEvents((prev) => {
      const filtered = prev.slice(0, MAX_EVENTS - 1);
      return [entry, ...filtered];
    });
  }, []);

  // Reactivate an existing event (for replay)
  const reactivateEvent = useCallback(
    (eventId: string, newHideAt: number | undefined) => {
      // Clear any existing timeout for this event
      const existingTimeout = hideTimeoutsRef.current.get(eventId);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
        hideTimeoutsRef.current.delete(eventId);
      }

      setEvents((prev) => {
        const eventIndex = prev.findIndex((e) => e.id === eventId);
        if (eventIndex === -1) return prev;

        const updatedEvent = {
          ...prev[eventIndex],
          isActive: true,
          timestamp: Date.now(),
          hideAt: newHideAt,
        };

        // Move the reactivated event to the top of the list
        const newEvents = [
          updatedEvent,
          ...prev.slice(0, eventIndex),
          ...prev.slice(eventIndex + 1),
        ];

        return newEvents;
      });

      // Setup new hide timeout if needed
      if (newHideAt) {
        const delay = newHideAt - Date.now();
        if (delay > 0) {
          const timeout = setTimeout(() => {
            setEvents((prev) =>
              prev.map((e) => (e.id === eventId ? { ...e, isActive: false } : e))
            );
            hideTimeoutsRef.current.delete(eventId);
          }, delay);
          hideTimeoutsRef.current.set(eventId, timeout);
        }
      }
    },
    []
  );

  // Check if incoming event matches a pending replay
  const checkAndHandleReplay = useCallback(
    (channel: string, duration: number | undefined): boolean => {
      const replay = replayingEventRef.current;
      if (!replay) return false;

      // Check if this is the replayed event (same channel, within 2 seconds)
      const isReplay =
        replay.channel === channel && Date.now() - replay.timestamp < 2000;

      if (isReplay) {
        const newHideAt = duration ? Date.now() + duration * 1000 : undefined;
        reactivateEvent(replay.id, newHideAt);
        replayingEventRef.current = null;
        return true;
      }

      return false;
    },
    [reactivateEvent]
  );

  // Setup hide timeout helper
  const setupHideTimeout = useCallback((entry: EventLogEntry) => {
    if (entry.hideAt) {
      const delay = entry.hideAt - Date.now();
      if (delay > 0) {
        const timeout = setTimeout(() => {
          setEvents((prev) =>
            prev.map((e) => (e.id === entry.id ? { ...e, isActive: false } : e))
          );
          hideTimeoutsRef.current.delete(entry.id);
        }, delay);
        hideTimeoutsRef.current.set(entry.id, timeout);
      }
    }
  }, []);

  // Mark channel inactive helper
  const markChannelInactive = useCallback((channel: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.display.channel === channel && e.isActive
          ? { ...e, isActive: false }
          : e
      )
    );
  }, []);

  // WebSocket connection
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;

      try {
        const ws = new WebSocket(getWebSocketUrl());
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          // Subscribe to overlay channels
          ws.send(JSON.stringify({ type: "subscribe", channel: "lower" }));
          ws.send(JSON.stringify({ type: "subscribe", channel: "poster" }));
          ws.send(
            JSON.stringify({ type: "subscribe", channel: "poster-bigpicture" })
          );
          ws.send(
            JSON.stringify({ type: "subscribe", channel: "chat-highlight" })
          );
        };

        ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            const { channel, data } = message;

            if (!data) return;

            // Handle lower third events
            if (channel === "lower") {
              if (data.type === "show" && data.payload) {
                const payload = data.payload;

                // Check if this is a replay - if so, reactivate existing event
                if (checkAndHandleReplay("lower", payload.duration)) {
                  return;
                }

                const contentType = payload.contentType;
                const type =
                  contentType === "guest"
                    ? EventLogType.GUEST
                    : EventLogType.CUSTOM_TEXT;

                const entry: EventLogEntry = {
                  id: data.id || crypto.randomUUID(),
                  type,
                  timestamp: Date.now(),
                  from: payload.from || EventSource.REGIE,
                  isActive: true,
                  hideAt: payload.duration
                    ? Date.now() + payload.duration * 1000
                    : undefined,
                  display: {
                    title:
                      contentType === "guest"
                        ? payload.title || "Unknown Guest"
                        : payload.title ||
                          payload.body?.substring(0, 50) ||
                          "Custom Text",
                    subtitle:
                      contentType === "guest" ? payload.subtitle : undefined,
                    channel: "lower",
                    side: payload.side,
                  },
                  originalPayload: payload,
                  originalChannel: "lower",
                };

                addEvent(entry);
                setupHideTimeout(entry);
              } else if (data.type === "hide") {
                markChannelInactive("lower");
              }
            }

            // Handle poster events
            if (channel === "poster" || channel === "poster-bigpicture") {
              if (data.type === "show" && data.payload) {
                const payload = data.payload;

                // Check if this is a replay - if so, reactivate existing event
                if (checkAndHandleReplay(channel, payload.duration)) {
                  return;
                }

                // For poster-bigpicture channel, display as "big", otherwise use payload.side
                const posterSide =
                  channel === "poster-bigpicture" ? "big" : payload.side;

                const entry: EventLogEntry = {
                  id: data.id || crypto.randomUUID(),
                  type: EventLogType.POSTER,
                  timestamp: Date.now(),
                  from: payload.from || EventSource.REGIE,
                  isActive: true,
                  hideAt: payload.duration
                    ? Date.now() + payload.duration * 1000
                    : undefined,
                  display: {
                    title: payload.source || "Poster",
                    subtitle: payload.type || "image",
                    channel,
                    side: posterSide,
                  },
                  originalPayload: payload,
                  originalChannel: channel,
                };

                addEvent(entry);
                setupHideTimeout(entry);
              } else if (data.type === "hide") {
                markChannelInactive(channel);
              }
            }

            // Handle chat highlight events
            if (channel === "chat-highlight") {
              if (data.type === "show" && data.payload) {
                const payload = data.payload;

                // Check if this is a replay - if so, reactivate existing event
                if (checkAndHandleReplay("chat-highlight", payload.duration)) {
                  return;
                }

                const entry: EventLogEntry = {
                  id: data.id || crypto.randomUUID(),
                  type: EventLogType.CHAT_HIGHLIGHT,
                  timestamp: Date.now(),
                  from: payload.from || EventSource.REGIE,
                  isActive: true,
                  hideAt: payload.duration
                    ? Date.now() + payload.duration * 1000
                    : undefined,
                  display: {
                    title: payload.displayName || payload.username,
                    subtitle: truncateMessage(payload.message || "", 40),
                    channel: "chat-highlight",
                    side: payload.side,
                  },
                  originalPayload: payload,
                  originalChannel: "chat-highlight",
                };

                addEvent(entry);
                setupHideTimeout(entry);
              } else if (data.type === "hide") {
                markChannelInactive("chat-highlight");
              }
            }
          } catch (error) {
            console.error("[EventLog] Parse error:", error);
          }
        };

        ws.onerror = () => {
          // Silently handle, will reconnect
        };

        ws.onclose = () => {
          wsRef.current = null;
          setIsConnected(false);
          if (!isUnmounted) {
            reconnectTimeout = setTimeout(connectWebSocket, 3000);
          }
        };
      } catch (error) {
        console.error("[EventLog] Connection error:", error);
        if (!isUnmounted) {
          reconnectTimeout = setTimeout(connectWebSocket, 3000);
        }
      }
    };

    // Delay initial connection slightly
    const initialTimeout = setTimeout(connectWebSocket, 500);

    return () => {
      isUnmounted = true;
      clearTimeout(initialTimeout);
      clearTimeout(reconnectTimeout);

      // Clear overlay state timeouts
      hideTimeoutsRef.current.forEach((t) => clearTimeout(t));
      hideTimeoutsRef.current.clear();

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [addEvent, setupHideTimeout, markChannelInactive, checkAndHandleReplay]);

  // Public methods
  const clearAll = useCallback(() => {
    hideTimeoutsRef.current.forEach((t) => clearTimeout(t));
    hideTimeoutsRef.current.clear();
    setEvents([]);
  }, []);

  const removeEvent = useCallback((id: string) => {
    const timeout = hideTimeoutsRef.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      hideTimeoutsRef.current.delete(id);
    }
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const stopOverlay = useCallback(async (entry: EventLogEntry) => {
    const endpoint = getEndpointForChannel(entry.originalChannel);
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hide" }),
      });
    } catch (error) {
      console.error("[EventLog] Failed to stop overlay:", error);
    }
  }, []);

  const replayOverlay = useCallback(async (entry: EventLogEntry) => {
    const endpoint = getEndpointForChannel(entry.originalChannel);

    // Mark this event as being replayed so we can reactivate it instead of creating a duplicate
    replayingEventRef.current = {
      id: entry.id,
      channel: entry.originalChannel,
      timestamp: Date.now(),
    };

    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "show",
          payload: entry.originalPayload,
        }),
      });
    } catch (error) {
      console.error("[EventLog] Failed to replay overlay:", error);
      // Clear the replay tracking on error
      replayingEventRef.current = null;
    }
  }, []);

  // Filtered events
  const filteredEvents =
    filter === "all" ? events : events.filter((e) => e.type === filter);

  return {
    events,
    filteredEvents,
    filter,
    setFilter,
    clearAll,
    removeEvent,
    stopOverlay,
    replayOverlay,
    isConnected,
  };
}

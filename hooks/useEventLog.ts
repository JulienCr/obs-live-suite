"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  EventLogEntry,
  EventLogType,
  EventLogFilter,
  StoredEventLog,
} from "@/lib/models/EventLog";
import { EventSource, OverlayChannel } from "@/lib/models/OverlayEvents";
import {
  EVENT_LOG_CHANNELS,
  OVERLAY_CHANNEL_ENDPOINTS,
} from "@/lib/config/overlayChannels";
import { useMultiChannelWebSocket } from "./useMultiChannelWebSocket";
import { useTimeoutMap } from "./useTimeoutMap";
import { apiPost } from "@/lib/utils/ClientFetch";

// Re-export EventSource for consumers that need it alongside EventLog types
export { EventSource };

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

interface ReplayTracking {
  id: string;
  channel: string;
  timestamp: number;
}

interface WebSocketEventData {
  type?: string;
  id?: string;
  payload?: Record<string, unknown>;
}

// Storage helpers
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

// Helper functions
function truncateMessage(message: string, maxLen: number): string {
  if (message.length <= maxLen) return message;
  return message.substring(0, maxLen - 3) + "...";
}

function calculateHideAt(durationSeconds: number | undefined): number | undefined {
  return durationSeconds ? Date.now() + durationSeconds * 1000 : undefined;
}

// Event entry builders for each channel type
function buildLowerThirdEntry(
  data: WebSocketEventData,
  payload: Record<string, unknown>
): EventLogEntry {
  const contentType = payload.contentType as string | undefined;
  const isGuest = contentType === "guest";

  return {
    id: data.id || crypto.randomUUID(),
    type: isGuest ? EventLogType.GUEST : EventLogType.CUSTOM_TEXT,
    timestamp: Date.now(),
    from: (payload.from as EventSource) || EventSource.REGIE,
    isActive: true,
    hideAt: calculateHideAt(payload.duration as number | undefined),
    display: {
      title: isGuest
        ? (payload.title as string) || "Unknown Guest"
        : (payload.title as string) ||
          (payload.body as string)?.substring(0, 50) ||
          "Custom Text",
      subtitle: isGuest ? (payload.subtitle as string) : undefined,
      channel: "lower",
      side: payload.side as string | undefined,
    },
    originalPayload: payload,
    originalChannel: "lower",
  };
}

function buildPosterEntry(
  data: WebSocketEventData,
  payload: Record<string, unknown>,
  channel: string
): EventLogEntry {
  const posterSide = channel === "poster-bigpicture" ? "big" : (payload.side as string);

  return {
    id: data.id || crypto.randomUUID(),
    type: EventLogType.POSTER,
    timestamp: Date.now(),
    from: (payload.from as EventSource) || EventSource.REGIE,
    isActive: true,
    hideAt: calculateHideAt(payload.duration as number | undefined),
    display: {
      title: (payload.source as string) || "Poster",
      subtitle: (payload.type as string) || "image",
      channel,
      side: posterSide,
    },
    originalPayload: payload,
    originalChannel: channel,
  };
}

function buildChatHighlightEntry(
  data: WebSocketEventData,
  payload: Record<string, unknown>
): EventLogEntry {
  return {
    id: data.id || crypto.randomUUID(),
    type: EventLogType.CHAT_HIGHLIGHT,
    timestamp: Date.now(),
    from: (payload.from as EventSource) || EventSource.REGIE,
    isActive: true,
    hideAt: calculateHideAt(payload.duration as number | undefined),
    display: {
      title: (payload.displayName as string) || (payload.username as string),
      subtitle: truncateMessage((payload.message as string) || "", 40),
      channel: "chat-highlight",
      side: payload.side as string | undefined,
    },
    originalPayload: payload,
    originalChannel: "chat-highlight",
  };
}

export function useEventLog(): UseEventLogReturn {
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [filter, setFilter] = useState<EventLogFilter>("all");
  const [isLoaded, setIsLoaded] = useState(false);
  const { set: setHideTimeout, clear: clearHideTimeout, clearAll: clearAllTimeouts } = useTimeoutMap();
  const replayingEventRef = useRef<ReplayTracking | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = loadFromStorage();
    if (stored.length > 0) {
      // Clear stale active states on load
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

  const setupHideTimeout = useCallback(
    (entry: EventLogEntry) => {
      if (!entry.hideAt) return;

      const delay = entry.hideAt - Date.now();
      if (delay <= 0) return;

      setHideTimeout(
        entry.id,
        () => setEvents((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, isActive: false } : e))
        ),
        delay
      );
    },
    [setHideTimeout]
  );

  // Event management
  const addEvent = useCallback(
    (entry: EventLogEntry) => {
      setEvents((prev) => [entry, ...prev.slice(0, MAX_EVENTS - 1)]);
      setupHideTimeout(entry);
    },
    [setupHideTimeout]
  );

  const reactivateEvent = useCallback(
    (eventId: string, newHideAt: number | undefined) => {
      clearHideTimeout(eventId);

      setEvents((prev) => {
        const eventIndex = prev.findIndex((e) => e.id === eventId);
        if (eventIndex === -1) return prev;

        const updatedEvent = {
          ...prev[eventIndex],
          isActive: true,
          timestamp: Date.now(),
          hideAt: newHideAt,
        };

        // Move to top of list
        return [
          updatedEvent,
          ...prev.slice(0, eventIndex),
          ...prev.slice(eventIndex + 1),
        ];
      });

      // Setup new hide timeout
      if (newHideAt) {
        const delay = newHideAt - Date.now();
        if (delay > 0) {
          setHideTimeout(
            eventId,
            () => setEvents((prev) =>
              prev.map((e) => (e.id === eventId ? { ...e, isActive: false } : e))
            ),
            delay
          );
        }
      }
    },
    [clearHideTimeout, setHideTimeout]
  );

  const markChannelInactive = useCallback((channel: string) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.display.channel === channel && e.isActive ? { ...e, isActive: false } : e
      )
    );
  }, []);

  // Check for replay and handle reactivation
  const checkAndHandleReplay = useCallback(
    (channel: string, duration: number | undefined): boolean => {
      const replay = replayingEventRef.current;
      if (!replay) return false;

      // Match replay if same channel and within 2 seconds
      if (replay.channel === channel && Date.now() - replay.timestamp < 2000) {
        reactivateEvent(replay.id, calculateHideAt(duration));
        replayingEventRef.current = null;
        return true;
      }

      return false;
    },
    [reactivateEvent]
  );

  // WebSocket message handler
  const handleWebSocketMessage = useCallback(
    (channel: string, data: unknown) => {
      const eventData = data as WebSocketEventData;
      if (!eventData?.type) return;

      const { type, payload } = eventData;

      // Handle hide events
      if (type === "hide") {
        markChannelInactive(channel);
        return;
      }

      // Handle show events
      if (type === "show" && payload) {
        // Check if this is a replay
        if (checkAndHandleReplay(channel, payload.duration as number | undefined)) {
          return;
        }

        // Build and add new event based on channel type
        let entry: EventLogEntry | null = null;

        switch (channel) {
          case "lower":
            entry = buildLowerThirdEntry(eventData, payload);
            break;
          case "poster":
          case "poster-bigpicture":
            entry = buildPosterEntry(eventData, payload, channel);
            break;
          case "chat-highlight":
            entry = buildChatHighlightEntry(eventData, payload);
            break;
        }

        if (entry) {
          addEvent(entry);
        }
      }
    },
    [addEvent, markChannelInactive, checkAndHandleReplay]
  );

  // WebSocket connection
  const { isConnected } = useMultiChannelWebSocket({
    channels: EVENT_LOG_CHANNELS,
    onMessage: handleWebSocketMessage,
    logPrefix: "EventLog",
  });

  // Public methods
  const clearAll = useCallback(() => {
    clearAllTimeouts();
    setEvents([]);
  }, [clearAllTimeouts]);

  const removeEvent = useCallback(
    (id: string) => {
      clearHideTimeout(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    },
    [clearHideTimeout]
  );

  const stopOverlay = useCallback(async (entry: EventLogEntry) => {
    const channelKey = entry.originalChannel as OverlayChannel;
    const endpoint = OVERLAY_CHANNEL_ENDPOINTS[channelKey] || OVERLAY_CHANNEL_ENDPOINTS[OverlayChannel.LOWER];
    try {
      await apiPost(endpoint, { action: "hide" });
    } catch (error) {
      console.error("[EventLog] Failed to stop overlay:", error);
    }
  }, []);

  const replayOverlay = useCallback(async (entry: EventLogEntry) => {
    const channelKey = entry.originalChannel as OverlayChannel;
    const endpoint = OVERLAY_CHANNEL_ENDPOINTS[channelKey] || OVERLAY_CHANNEL_ENDPOINTS[OverlayChannel.LOWER];

    // Mark for replay tracking
    replayingEventRef.current = {
      id: entry.id,
      channel: entry.originalChannel,
      timestamp: Date.now(),
    };

    try {
      await apiPost(endpoint, {
        action: "show",
        payload: entry.originalPayload,
      });
    } catch (error) {
      console.error("[EventLog] Failed to replay overlay:", error);
      replayingEventRef.current = null;
    }
  }, []);

  // Filtered events (memoized)
  const filteredEvents = useMemo(
    () => (filter === "all" ? events : events.filter((e) => e.type === filter)),
    [events, filter]
  );

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

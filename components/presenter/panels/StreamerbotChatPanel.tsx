"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Wifi,
  WifiOff,
  Settings,
  Trash2,
  Search,
  ArrowDown,
  Loader2,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type StreamerbotConnectionSettings,
  type ChatMessage,
  StreamerbotConnectionStatus,
} from "@/lib/models/StreamerbotChat";
import { useStreamerbotClient } from "../hooks/useStreamerbotClient";
import {
  useStreamerbotMessages,
  getMessageHighlights,
  getRoleHighlightClasses,
  getUsernameColorClass,
} from "../hooks/useStreamerbotMessages";
import { useStreamerbotChatSettings } from "../hooks/useStreamerbotChatSettings";

export interface StreamerbotChatPanelProps {
  connectionSettings?: StreamerbotConnectionSettings;
  roomId: string;
}

/**
 * Streamer.bot Chat Panel with virtualized message list
 */
export function StreamerbotChatPanel({
  connectionSettings,
  roomId,
}: StreamerbotChatPanelProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

  const { preferences, updatePreferences, isLoaded: settingsLoaded } = useStreamerbotChatSettings();

  const {
    messages,
    addMessage,
    clearMessages,
    filteredMessages,
    searchTerm,
    setSearchTerm,
    messageCount,
  } = useStreamerbotMessages({
    maxMessages: preferences.maxMessages,
    highlightRules: preferences.highlightRules,
  });

  const { status, error, connect, disconnect, lastEventTime } = useStreamerbotClient({
    settings: connectionSettings ?? null,
    onMessage: addMessage,
    onError: (err) => {
      // Only log unexpected errors, not connection refused (expected when Streamer.bot is not running)
      if (err.type !== "connection_refused") {
        console.warn("[ChatPanel] Connection error:", err.message || err.type);
      }
    },
  });

  // Virtual list configuration
  const rowVirtualizer = useVirtualizer({
    count: filteredMessages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (preferences.compactMode ? 28 : 44),
    overscan: 10,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom && filteredMessages.length > 0 && preferences.autoScroll) {
      rowVirtualizer.scrollToIndex(filteredMessages.length - 1, {
        align: "end",
        behavior: "smooth",
      });
    }
  }, [filteredMessages.length, isAtBottom, preferences.autoScroll, rowVirtualizer]);

  // Handle scroll to detect if user is at bottom
  const handleScroll = useCallback(() => {
    const parent = parentRef.current;
    if (!parent) return;

    const { scrollTop, scrollHeight, clientHeight } = parent;
    const threshold = 50;
    const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
    setIsAtBottom(atBottom);
  }, []);

  // Scroll to bottom button handler
  const scrollToBottom = useCallback(() => {
    if (filteredMessages.length > 0) {
      rowVirtualizer.scrollToIndex(filteredMessages.length - 1, {
        align: "end",
        behavior: "smooth",
      });
      setIsAtBottom(true);
    }
  }, [filteredMessages.length, rowVirtualizer]);

  // Format timestamp
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Get connection status color
  const getStatusColor = () => {
    switch (status) {
      case StreamerbotConnectionStatus.CONNECTED:
        return "text-green-500";
      case StreamerbotConnectionStatus.CONNECTING:
      case StreamerbotConnectionStatus.AUTHENTICATING:
        return "text-yellow-500";
      case StreamerbotConnectionStatus.ERROR:
        return "text-red-500";
      default:
        return "text-muted-foreground";
    }
  };

  // Get status text
  const getStatusText = () => {
    switch (status) {
      case StreamerbotConnectionStatus.CONNECTED:
        return "Connected";
      case StreamerbotConnectionStatus.CONNECTING:
        return "Connecting...";
      case StreamerbotConnectionStatus.AUTHENTICATING:
        return "Authenticating...";
      case StreamerbotConnectionStatus.ERROR:
        return error?.message || "Error";
      default:
        return "Disconnected";
    }
  };

  // No settings configured
  if (!connectionSettings) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/50 text-muted-foreground p-4">
        <MessageSquare className="h-8 w-8 mb-2" />
        <p className="text-sm font-medium">Chat not configured</p>
        <p className="text-xs mt-1 text-center">
          Configure Streamer.bot connection in Room Settings
        </p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="flex-shrink-0 h-10 px-3 flex items-center justify-between border-b bg-card">
        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className={cn("flex items-center gap-1.5", getStatusColor())}>
            {status === StreamerbotConnectionStatus.CONNECTED ? (
              <Wifi className="h-4 w-4" />
            ) : status === StreamerbotConnectionStatus.CONNECTING ||
              status === StreamerbotConnectionStatus.AUTHENTICATING ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
            <span className="text-xs">{getStatusText()}</span>
          </div>

          {/* Message count */}
          <span className="text-xs text-muted-foreground">({messageCount})</span>
        </div>

        <div className="flex items-center gap-1">
          {/* Search toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setShowSearch(!showSearch)}
          >
            <Search className="h-3.5 w-3.5" />
          </Button>

          {/* Clear messages */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={clearMessages}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>

          {/* Connect/Disconnect */}
          {status === StreamerbotConnectionStatus.CONNECTED ? (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={disconnect}>
              Disconnect
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={connect}
              disabled={status === StreamerbotConnectionStatus.CONNECTING}
            >
              Connect
            </Button>
          )}
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="flex-shrink-0 px-2 py-1.5 border-b bg-muted/30">
          <Input
            type="search"
            placeholder="Search messages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-7 text-xs"
          />
        </div>
      )}

      {/* Auto-scroll toggle */}
      <div className="flex-shrink-0 px-3 py-1 flex items-center justify-between border-b bg-muted/20">
        <div className="flex items-center gap-2">
          <Switch
            id="autoscroll"
            checked={preferences.autoScroll}
            onCheckedChange={(checked) => updatePreferences({ autoScroll: checked })}
            className="scale-75"
          />
          <Label htmlFor="autoscroll" className="text-xs cursor-pointer">
            Auto-scroll
          </Label>
        </div>

        <div className="flex items-center gap-2">
          <Switch
            id="timestamps"
            checked={preferences.showTimestamps}
            onCheckedChange={(checked) => updatePreferences({ showTimestamps: checked })}
            className="scale-75"
          />
          <Label htmlFor="timestamps" className="text-xs cursor-pointer">
            Timestamps
          </Label>
        </div>
      </div>

      {/* Messages list (virtualized) */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto min-h-0"
        onScroll={handleScroll}
      >
        {filteredMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">
                {status === StreamerbotConnectionStatus.CONNECTED
                  ? "Waiting for messages..."
                  : "Connect to see chat messages"}
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const message = filteredMessages[virtualItem.index];
              const highlights = getMessageHighlights(message, preferences.highlightRules);
              const roleClasses = getRoleHighlightClasses(highlights.role);
              const usernameClass = getUsernameColorClass(
                highlights.role,
                message.metadata?.color
              );

              return (
                <div
                  key={message.id}
                  className={cn(
                    "absolute top-0 left-0 w-full px-2 py-1 hover:bg-muted/30 transition-colors",
                    roleClasses,
                    highlights.keyword && `border-l-2`,
                    preferences.compactMode ? "text-xs" : "text-sm"
                  )}
                  style={{
                    height: `${virtualItem.size}px`,
                    transform: `translateY(${virtualItem.start}px)`,
                    borderLeftColor: highlights.keyword?.color,
                  }}
                >
                  <div className="flex items-start gap-1.5">
                    {/* Timestamp */}
                    {preferences.showTimestamps && (
                      <span className="text-muted-foreground text-[10px] flex-shrink-0 pt-0.5">
                        {formatTime(message.timestamp)}
                      </span>
                    )}

                    {/* Username */}
                    <span
                      className={cn("font-medium flex-shrink-0", usernameClass)}
                      style={
                        message.metadata?.color && !highlights.role
                          ? { color: message.metadata.color }
                          : undefined
                      }
                    >
                      {message.displayName}:
                    </span>

                    {/* Message */}
                    <span className="break-words min-w-0">{message.message}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && filteredMessages.length > 0 && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-4 right-4 h-8 shadow-md"
          onClick={scrollToBottom}
        >
          <ArrowDown className="h-4 w-4 mr-1" />
          New messages
        </Button>
      )}
    </div>
  );
}

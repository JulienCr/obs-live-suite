"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { MessageSquare } from "lucide-react";
import { useStreamerbotClient } from "../../hooks/useStreamerbotClient";
import { useStreamerbotMessages } from "../../hooks/useStreamerbotMessages";
import { useStreamerbotChatSettings } from "../../hooks/useStreamerbotChatSettings";
import { ChatMessageInput } from "../../chat/ChatMessageInput";
import { StreamerbotChatHeader } from "./StreamerbotChatHeader";
import { StreamerbotChatToolbar, SearchBar } from "./StreamerbotChatToolbar";
import { StreamerbotChatMessageList } from "./StreamerbotChatMessageList";
import type { StreamerbotChatPanelProps, ChatMessage } from "./types";
import { StreamerbotConnectionStatus } from "./types";
import { DEFAULT_STREAMERBOT_CONNECTION } from "@/lib/models/StreamerbotChat";
import { useToast } from "@/hooks/use-toast";
import { apiPost, isClientFetchError } from "@/lib/utils/ClientFetch";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import type { TwitchEvent } from "@/lib/models/Twitch";
import { useChatHighlightSync } from "@/hooks/useChatHighlightSync";

/**
 * Streamer.bot Chat Panel - Main orchestrator component
 *
 * Combines header, toolbar, message list, and input components
 * into a complete chat interface.
 */
export function StreamerbotChatPanel({
  allowSendMessage = false,
  showClearButton = true,
}: StreamerbotChatPanelProps) {
  const t = useTranslations("presenter");
  const { toast } = useToast();
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showingInOverlayId, setShowingInOverlayId] = useState<string | null>(null);
  const [currentlyDisplayedId, setCurrentlyDisplayedId] = useState<string | null>(null);
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [moderateLoadingId, setModerateLoadingId] = useState<string | null>(null);

  // Subscribe to Twitch WebSocket for viewer count updates
  const handleTwitchEvent = useCallback((data: TwitchEvent) => {
    if (data.type === "stream-info") {
      setViewerCount(data.data.viewerCount);
    }
  }, []);

  useWebSocketChannel<TwitchEvent>("twitch", handleTwitchEvent, {
    logPrefix: "StreamerbotChatPanel",
  });

  // Sync with shared overlay state (handles external show/hide from EventLog)
  useChatHighlightSync(currentlyDisplayedId, setCurrentlyDisplayedId);

  // Chat settings from localStorage
  const {
    preferences,
    updatePreferences,
    isLoaded: settingsLoaded,
  } = useStreamerbotChatSettings();

  // Message management
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

  // Connection management - settings are managed by the backend gateway
  // We pass a truthy object to allow connect() to proceed; actual settings are on the backend
  const {
    status,
    error,
    connect,
    disconnect,
    lastEventTime,
    sendMessage,
    canSendMessages,
  } = useStreamerbotClient({
    settings: DEFAULT_STREAMERBOT_CONNECTION, // Backend manages actual settings
    onMessage: addMessage,
    onError: (err) => {
      // Only log unexpected errors, not connection refused
      if (err.type !== "connection_refused") {
        console.warn("[ChatPanel] Connection error:", err.message || err.type);
      }
    },
  });

  // Show/hide in overlay handler - toggle display of chat highlight overlay
  const handleShowInOverlay = useCallback(async (message: ChatMessage) => {
    if (showingInOverlayId) return;

    // Toggle: if already displayed, hide it
    const isCurrentlyDisplayed = currentlyDisplayedId === message.id;
    const action = isCurrentlyDisplayed ? "hide" : "show";

    setShowingInOverlayId(message.id);
    try {
      await apiPost(
        "/api/overlays/chat-highlight",
        action === "show"
          ? {
              action: "show",
              payload: {
                messageId: message.id,
                platform: message.platform,
                username: message.username,
                displayName: message.displayName,
                message: message.message,
                parts: message.parts,
                metadata: message.metadata,
                duration: 10,
                from: "presenter",
              },
            }
          : { action: "hide" }
      );

      if (action === "show") {
        setCurrentlyDisplayedId(message.id);
        toast({
          title: t("overlay.showingInOverlay"),
          description: t("overlay.messageFrom", { author: message.displayName }),
        });

        // Auto-clear the displayed ID after duration
        setTimeout(() => {
          setCurrentlyDisplayedId((prev) => (prev === message.id ? null : prev));
        }, 10000);
      } else {
        setCurrentlyDisplayedId(null);
      }
    } catch (error) {
      const errorMessage = isClientFetchError(error) ? error.errorMessage : String(error);
      console.error("Failed to update overlay:", errorMessage);
      toast({
        title: t("status.error"),
        description: t("overlay.failedToUpdate"),
        variant: "destructive",
      });
    } finally {
      setShowingInOverlayId(null);
    }
  }, [showingInOverlayId, currentlyDisplayedId, toast, t]);

  // Moderation handler for delete/timeout/ban actions
  const handleModerate = useCallback(
    async (
      message: ChatMessage,
      action: "delete" | "timeout" | "ban",
      duration?: number
    ) => {
      if (moderateLoadingId) return;

      setModerateLoadingId(message.id);

      try {
        const baseUrl = "/api/twitch/moderation";

        if (action === "delete") {
          const msgId = message.metadata?.twitchMsgId;
          if (!msgId) throw new Error("Missing Twitch message ID");
          await fetch(`${baseUrl}/message?messageId=${msgId}`, {
            method: "DELETE",
          });
          toast({ title: t("moderation.messageDeleted") });
        } else if (action === "timeout") {
          const userId = message.metadata?.twitchUserId;
          if (!userId) throw new Error("Missing Twitch user ID");
          await fetch(`${baseUrl}/timeout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, duration: duration || 600 }),
          });
          toast({ title: t("moderation.userTimedOut") });
        } else if (action === "ban") {
          const userId = message.metadata?.twitchUserId;
          if (!userId) throw new Error("Missing Twitch user ID");
          await fetch(`${baseUrl}/ban`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
          });
          toast({ title: t("moderation.userBanned") });
        }
      } catch (error) {
        toast({
          title: t("moderation.failed"),
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      } finally {
        setModerateLoadingId(null);
      }
    },
    [moderateLoadingId, toast, t]
  );

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with status and controls */}
      <StreamerbotChatHeader
        status={status}
        error={error ?? undefined}
        messageCount={messageCount}
        viewerCount={viewerCount}
        showSearch={showSearch}
        onToggleSearch={() => setShowSearch(!showSearch)}
        onClearMessages={clearMessages}
        onConnect={connect}
        onDisconnect={disconnect}
        showClearButton={showClearButton}
      />

      {/* Search bar (conditional) */}
      {showSearch && (
        <SearchBar searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      )}

      {/* Settings toolbar */}
      <StreamerbotChatToolbar
        preferences={preferences}
        onUpdatePreferences={updatePreferences}
      />

      {/* Virtualized message list with overlay button */}
      <StreamerbotChatMessageList
        messages={filteredMessages}
        preferences={preferences}
        status={status}
        isAtBottom={isAtBottom}
        onScrollChange={setIsAtBottom}
        onScrollToBottom={() => setIsAtBottom(true)}
        onShowInOverlay={handleShowInOverlay}
        showingInOverlayId={showingInOverlayId}
        currentlyDisplayedId={currentlyDisplayedId}
        onModerate={handleModerate}
        moderateLoadingId={moderateLoadingId}
      />

      {/* Message input (when enabled) */}
      {allowSendMessage && canSendMessages && (
        <ChatMessageInput
          onSend={sendMessage}
          disabled={status !== StreamerbotConnectionStatus.CONNECTED}
          placeholder={t("chat.sendPlaceholder")}
        />
      )}
    </div>
  );
}

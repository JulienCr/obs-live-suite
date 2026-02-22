"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { type IDockviewPanelProps } from "dockview-react";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { useStreamerbotClient } from "@/components/presenter/hooks/useStreamerbotClient";
import { useStreamerbotMessages } from "@/components/presenter/hooks/useStreamerbotMessages";
import { useStreamerbotChatSettings } from "@/components/presenter/hooks/useStreamerbotChatSettings";
import { StreamerbotChatHeader } from "@/components/presenter/panels/streamerbot-chat/StreamerbotChatHeader";
import { StreamerbotChatToolbar, SearchBar } from "@/components/presenter/panels/streamerbot-chat/StreamerbotChatToolbar";
import { RegiePublicChatMessageList } from "./regie-public-chat/RegiePublicChatMessageList";
import type { ChatMessage } from "@/lib/models/StreamerbotChat";
import { DEFAULT_STREAMERBOT_CONNECTION } from "@/lib/models/StreamerbotChat";
import { type ModerationAction, StreamerbotConnectionStatus } from "./regie-public-chat/types";
import { CueType, CueFrom, CueAction } from "@/lib/models/Cue";
import { useToast } from "@/hooks/use-toast";
import { apiPost, apiDelete } from "@/lib/utils/ClientFetch";
import { useChatHighlightSync } from "@/hooks/useChatHighlightSync";
import { ChatMessageInput } from "@/components/presenter/chat/ChatMessageInput";

/**
 * Regie Public Chat Panel - Streamerbot chat with highlight functionality
 */
function RegiePublicChatContent() {
  const t = useTranslations("presenter");
  const { toast } = useToast();
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightingMessageId, setHighlightingMessageId] = useState<string | null>(null);
  const [showingInOverlayId, setShowingInOverlayId] = useState<string | null>(null);
  const [currentlyDisplayedId, setCurrentlyDisplayedId] = useState<string | null>(null);
  const [moderateLoadingId, setModerateLoadingId] = useState<string | null>(null);

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
    sendMessage,
    canSendMessages,
  } = useStreamerbotClient({
    settings: DEFAULT_STREAMERBOT_CONNECTION, // Backend manages actual settings
    onMessage: addMessage,
    onError: (err) => {
      if (err.type !== "connection_refused") {
        console.warn("[RegieChat] Connection error:", err.message || err.type);
      }
    },
  });

  // Highlight message handler - sends message to presenter CueFeed
  const handleHighlightMessage = useCallback(async (message: ChatMessage) => {
    if (highlightingMessageId) return;

    setHighlightingMessageId(message.id);
    try {
      const payload = {
        type: CueType.QUESTION,
        from: CueFrom.SYSTEM,
        questionPayload: {
          platform: message.platform,
          author: message.displayName,
          text: message.message,
          color: message.metadata?.color,
          badges: message.metadata?.badges,
          parts: message.parts,
        },
        actions: [CueAction.TAKE, CueAction.SKIP],
      };

      await apiPost("/api/presenter/cue/send", payload);
      toast({
        title: "Message sent",
        description: `Question from ${message.displayName} sent to presenter`,
      });
    } catch (error) {
      console.error("Failed to highlight message:", error);
      toast({
        title: "Error",
        description: "Failed to send message to presenter",
        variant: "destructive",
      });
    } finally {
      setHighlightingMessageId(null);
    }
  }, [highlightingMessageId, toast]);

  // Show/hide in overlay handler - toggle display of chat highlight overlay
  const handleShowInOverlay = useCallback(async (message: ChatMessage) => {
    if (showingInOverlayId) return;

    // Toggle: if already displayed, hide it
    const isCurrentlyDisplayed = currentlyDisplayedId === message.id;
    const action = isCurrentlyDisplayed ? "hide" : "show";

    setShowingInOverlayId(message.id);
    try {
      const overlayPayload = action === "show"
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
            },
          }
        : { action: "hide" };

      await apiPost("/api/overlays/chat-highlight", overlayPayload);

      if (action === "show") {
        setCurrentlyDisplayedId(message.id);
        toast({
          title: "Showing in overlay",
          description: `Message from ${message.displayName}`,
        });

        // Auto-clear the displayed ID after duration
        setTimeout(() => {
          setCurrentlyDisplayedId((prev) => (prev === message.id ? null : prev));
        }, 10000);
      } else {
        setCurrentlyDisplayedId(null);
      }
    } catch (error) {
      console.error("Failed to update overlay:", error);
      toast({
        title: "Error",
        description: "Failed to update overlay",
        variant: "destructive",
      });
    } finally {
      setShowingInOverlayId(null);
    }
  }, [showingInOverlayId, currentlyDisplayedId, toast]);

  // Moderation handler for delete/timeout/ban actions
  const handleModerate = useCallback(
    async (
      message: ChatMessage,
      action: ModerationAction,
      duration?: number
    ) => {
      if (moderateLoadingId) return;

      setModerateLoadingId(message.id);

      try {
        const baseUrl = "/api/twitch/moderation";

        switch (action) {
          case "delete": {
            const msgId = message.metadata?.twitchMsgId;
            if (!msgId) throw new Error("Missing Twitch message ID");
            await apiDelete(`${baseUrl}/message?messageId=${msgId}`);
            toast({ title: t("moderation.messageDeleted") });
            break;
          }
          case "timeout": {
            const userId = message.metadata?.twitchUserId;
            if (!userId) throw new Error("Missing Twitch user ID");
            await apiPost(`${baseUrl}/timeout`, { userId, duration: duration || 600 });
            toast({ title: t("moderation.userTimedOut") });
            break;
          }
          case "ban": {
            const userId = message.metadata?.twitchUserId;
            if (!userId) throw new Error("Missing Twitch user ID");
            await apiPost(`${baseUrl}/ban`, { userId });
            toast({ title: t("moderation.userBanned") });
            break;
          }
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
    <div className="h-full flex flex-col bg-background relative">
      {/* Header with status and controls */}
      <StreamerbotChatHeader
        status={status}
        error={error ?? undefined}
        messageCount={messageCount}
        showSearch={showSearch}
        onToggleSearch={() => setShowSearch(!showSearch)}
        onClearMessages={clearMessages}
        onConnect={connect}
        onDisconnect={disconnect}
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

      {/* Virtualized message list with highlight and overlay buttons */}
      <RegiePublicChatMessageList
        messages={filteredMessages}
        preferences={preferences}
        status={status}
        isAtBottom={isAtBottom}
        onScrollChange={setIsAtBottom}
        onScrollToBottom={() => setIsAtBottom(true)}
        onHighlightMessage={handleHighlightMessage}
        highlightingMessageId={highlightingMessageId}
        onShowInOverlay={handleShowInOverlay}
        showingInOverlayId={showingInOverlayId}
        currentlyDisplayedId={currentlyDisplayedId}
        onModerate={handleModerate}
        moderateLoadingId={moderateLoadingId}
      />

      {/* Message input */}
      {canSendMessages && (
        <ChatMessageInput
          onSend={sendMessage}
          disabled={status !== StreamerbotConnectionStatus.CONNECTED}
          placeholder={t("chat.sendPlaceholder")}
        />
      )}
    </div>
  );
}

const config: PanelConfig = { id: "regiePublicChat", context: "dashboard", padding: 0, scrollable: false };

export function RegiePublicChatPanel(_props: IDockviewPanelProps) {
  return (
    <BasePanelWrapper config={config}>
      <RegiePublicChatContent />
    </BasePanelWrapper>
  );
}

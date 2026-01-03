"use client";

import { useState, useCallback, useEffect } from "react";
import { type IDockviewPanelProps } from "dockview-react";
import { MessageSquare, Loader2 } from "lucide-react";
import { PanelColorMenu } from "../PanelColorMenu";
import { useStreamerbotClient } from "@/components/presenter/hooks/useStreamerbotClient";
import { useStreamerbotMessages } from "@/components/presenter/hooks/useStreamerbotMessages";
import { useStreamerbotChatSettings } from "@/components/presenter/hooks/useStreamerbotChatSettings";
import { StreamerbotChatHeader } from "@/components/presenter/panels/streamerbot-chat/StreamerbotChatHeader";
import { StreamerbotChatToolbar, SearchBar } from "@/components/presenter/panels/streamerbot-chat/StreamerbotChatToolbar";
import { RegiePublicChatMessageList } from "./regie-public-chat/RegiePublicChatMessageList";
import { StreamerbotConnectionStatus } from "@/lib/models/StreamerbotChat";
import type { ChatMessage, StreamerbotConnectionSettings } from "@/lib/models/StreamerbotChat";
import { CueType, CueFrom, CueAction } from "@/lib/models/Cue";
import { DEFAULT_ROOM_ID } from "@/lib/models/Room";
import { useToast } from "@/hooks/use-toast";
import { apiGet, apiPost } from "@/lib/utils/ClientFetch";

/**
 * Regie Public Chat Panel - Streamerbot chat with highlight functionality
 */
function RegiePublicChatContent() {
  const { toast } = useToast();
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [connectionSettings, setConnectionSettings] = useState<StreamerbotConnectionSettings | null>(null);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [highlightingMessageId, setHighlightingMessageId] = useState<string | null>(null);
  const [showingInOverlayId, setShowingInOverlayId] = useState<string | null>(null);
  const [currentlyDisplayedId, setCurrentlyDisplayedId] = useState<string | null>(null);

  // Fetch connection settings from default room
  useEffect(() => {
    async function fetchSettings() {
      try {
        const data = await apiGet<{ room?: { streamerbotConnection?: StreamerbotConnectionSettings } }>(
          `/api/presenter/rooms/${DEFAULT_ROOM_ID}`
        );
        setConnectionSettings(data.room?.streamerbotConnection || null);
      } catch (error) {
        console.error("Failed to fetch room settings:", error);
      } finally {
        setLoadingSettings(false);
      }
    }
    fetchSettings();
  }, []);

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

  // Connection management
  const {
    status,
    error,
    connect,
    disconnect,
  } = useStreamerbotClient({
    settings: connectionSettings,
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
        roomId: DEFAULT_ROOM_ID,
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

  // Loading state
  if (loadingSettings) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-muted/50 text-muted-foreground p-4">
        <Loader2 className="h-8 w-8 mb-2 animate-spin" />
        <p className="text-sm font-medium">Loading chat settings...</p>
      </div>
    );
  }

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
      />
    </div>
  );
}

export function RegiePublicChatPanel(props: IDockviewPanelProps) {
  return (
    <PanelColorMenu panelId="regiePublicChat">
      <div data-panel-id="regiePublicChat" style={{ height: "100%", overflow: "hidden" }}>
        <RegiePublicChatContent />
      </div>
    </PanelColorMenu>
  );
}

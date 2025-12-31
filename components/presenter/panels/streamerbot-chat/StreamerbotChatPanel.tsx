"use client";

import { useState, useCallback } from "react";
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
import { useToast } from "@/hooks/use-toast";

/**
 * Streamer.bot Chat Panel - Main orchestrator component
 *
 * Combines header, toolbar, message list, and input components
 * into a complete chat interface.
 */
export function StreamerbotChatPanel({
  connectionSettings,
  roomId,
  allowSendMessage = false,
}: StreamerbotChatPanelProps) {
  const { toast } = useToast();
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showSearch, setShowSearch] = useState(false);
  const [showingInOverlayId, setShowingInOverlayId] = useState<string | null>(null);
  const [currentlyDisplayedId, setCurrentlyDisplayedId] = useState<string | null>(null);

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
    lastEventTime,
    sendMessage,
    canSendMessages,
  } = useStreamerbotClient({
    settings: connectionSettings ?? null,
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
      const response = await fetch("/api/overlays/chat-highlight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
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
                },
              }
            : { action: "hide" }
        ),
      });

      if (response.ok) {
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
      } else {
        const errorText = await response.text();
        console.error("Failed to update overlay:", errorText);
        toast({
          title: "Error",
          description: "Failed to update overlay",
          variant: "destructive",
        });
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

  // No settings configured - show placeholder
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
      />

      {/* Message input (when enabled) */}
      {allowSendMessage && canSendMessages && (
        <ChatMessageInput
          onSend={sendMessage}
          disabled={status !== StreamerbotConnectionStatus.CONNECTED}
          placeholder="Send a message to chat..."
        />
      )}
    </div>
  );
}

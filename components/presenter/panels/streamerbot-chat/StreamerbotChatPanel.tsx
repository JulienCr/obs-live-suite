"use client";

import { useState } from "react";
import { MessageSquare } from "lucide-react";
import { useStreamerbotClient } from "../../hooks/useStreamerbotClient";
import { useStreamerbotMessages } from "../../hooks/useStreamerbotMessages";
import { useStreamerbotChatSettings } from "../../hooks/useStreamerbotChatSettings";
import { ChatMessageInput } from "../../chat/ChatMessageInput";
import { StreamerbotChatHeader } from "./StreamerbotChatHeader";
import { StreamerbotChatToolbar, SearchBar } from "./StreamerbotChatToolbar";
import { StreamerbotChatMessageList } from "./StreamerbotChatMessageList";
import type { StreamerbotChatPanelProps } from "./types";
import { StreamerbotConnectionStatus } from "./types";

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
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showSearch, setShowSearch] = useState(false);

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

      {/* Virtualized message list */}
      <StreamerbotChatMessageList
        messages={filteredMessages}
        preferences={preferences}
        status={status}
        isAtBottom={isAtBottom}
        onScrollChange={setIsAtBottom}
        onScrollToBottom={() => setIsAtBottom(true)}
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

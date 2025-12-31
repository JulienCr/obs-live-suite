/**
 * Streamerbot Chat Panel - Shared Types
 */

import type {
  StreamerbotConnectionSettings,
  ChatMessage,
  ChatUIPreferences,
  StreamerbotConnectionError,
} from "@/lib/models/StreamerbotChat";
import { StreamerbotConnectionStatus } from "@/lib/models/StreamerbotChat";

export interface StreamerbotChatPanelProps {
  connectionSettings?: StreamerbotConnectionSettings;
  roomId: string;
  allowSendMessage?: boolean;
}

export interface StreamerbotChatHeaderProps {
  status: StreamerbotConnectionStatus;
  error?: StreamerbotConnectionError;
  messageCount: number;
  showSearch: boolean;
  onToggleSearch: () => void;
  onClearMessages: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
}

export interface StreamerbotChatToolbarProps {
  preferences: ChatUIPreferences;
  onUpdatePreferences: (updates: Partial<ChatUIPreferences>) => void;
}

export interface StreamerbotChatMessageListProps {
  messages: ChatMessage[];
  preferences: ChatUIPreferences;
  status: StreamerbotConnectionStatus;
  isAtBottom: boolean;
  onScrollChange: (atBottom: boolean) => void;
  onScrollToBottom: () => void;
  onShowInOverlay?: (message: ChatMessage) => Promise<void>;
  showingInOverlayId?: string | null;
  currentlyDisplayedId?: string | null;
}

export interface SearchBarProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

// Re-export for convenience
export { StreamerbotConnectionStatus };
export type { ChatMessage, ChatUIPreferences, StreamerbotConnectionError };

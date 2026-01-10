/**
 * Streamerbot Chat Panel - Shared Types
 */

import type {
  ChatMessage,
  ChatUIPreferences,
  StreamerbotConnectionError,
} from "@/lib/models/StreamerbotChat";
import { StreamerbotConnectionStatus } from "@/lib/models/StreamerbotChat";

export interface StreamerbotChatPanelProps {
  /**
   * Whether the presenter is allowed to send messages via Streamerbot
   */
  allowSendMessage?: boolean;
  /**
   * Whether to show the clear messages button (default: true)
   */
  showClearButton?: boolean;
}

export interface StreamerbotChatHeaderProps {
  status: StreamerbotConnectionStatus;
  error?: StreamerbotConnectionError;
  messageCount: number;
  viewerCount?: number;
  showSearch: boolean;
  onToggleSearch: () => void;
  onClearMessages: () => void;
  onConnect: () => void;
  onDisconnect: () => void;
  /**
   * Whether to show the clear messages button (default: true)
   */
  showClearButton?: boolean;
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

/**
 * Regie Public Chat Panel - Shared Types
 */

import type {
  ChatMessage,
  ChatUIPreferences,
  StreamerbotConnectionError,
} from "@/lib/models/StreamerbotChat";
import { StreamerbotConnectionStatus } from "@/lib/models/StreamerbotChat";

export interface RegiePublicChatMessageListProps {
  messages: ChatMessage[];
  preferences: ChatUIPreferences;
  status: StreamerbotConnectionStatus;
  isAtBottom: boolean;
  onScrollChange: (atBottom: boolean) => void;
  onScrollToBottom: () => void;
  onHighlightMessage: (message: ChatMessage) => Promise<void>;
  highlightingMessageId: string | null;
}

// Re-export for convenience
export { StreamerbotConnectionStatus };
export type { ChatMessage, ChatUIPreferences, StreamerbotConnectionError };

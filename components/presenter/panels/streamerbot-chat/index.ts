/**
 * Streamerbot Chat Panel Module
 *
 * Modular chat panel components for displaying Streamer.bot
 * chat messages with virtualized scrolling.
 */

// Main panel component
export { StreamerbotChatPanel } from "./StreamerbotChatPanel";

// Sub-components (for customization)
export { StreamerbotChatHeader } from "./StreamerbotChatHeader";
export { StreamerbotChatToolbar, SearchBar } from "./StreamerbotChatToolbar";
export { StreamerbotChatMessageList } from "./StreamerbotChatMessageList";

// Types
export type {
  StreamerbotChatPanelProps,
  StreamerbotChatHeaderProps,
  StreamerbotChatToolbarProps,
  StreamerbotChatMessageListProps,
  SearchBarProps,
} from "./types";

"use client";

import { useCallback, useMemo, useState } from "react";
import type { ChatMessage, ChatPlatform, HighlightRule } from "@/lib/models/StreamerbotChat";

export interface UseStreamerbotMessagesOptions {
  maxMessages?: number;
  highlightRules?: HighlightRule[];
}

export interface UseStreamerbotMessagesReturn {
  messages: ChatMessage[];
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  filteredMessages: ChatMessage[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  platformFilter: ChatPlatform | null;
  setPlatformFilter: (platform: ChatPlatform | null) => void;
  messageCount: number;
}

const DEFAULT_MAX_MESSAGES = 2000;

/**
 * React hook for managing Streamer.bot chat messages with bounded buffer
 */
export function useStreamerbotMessages({
  maxMessages = DEFAULT_MAX_MESSAGES,
  highlightRules = [],
}: UseStreamerbotMessagesOptions = {}): UseStreamerbotMessagesReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [platformFilter, setPlatformFilter] = useState<ChatPlatform | null>(null);

  /**
   * Add a new message to the buffer, maintaining max size
   */
  const addMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((prev) => {
        // Check if message already exists (by ID)
        if (prev.some((m) => m.id === message.id)) {
          return prev;
        }

        const newMessages = [...prev, message];

        // Trim from the beginning if over capacity
        if (newMessages.length > maxMessages) {
          return newMessages.slice(-maxMessages);
        }

        return newMessages;
      });
    },
    [maxMessages]
  );

  /**
   * Clear all messages
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  /**
   * Filter messages based on search term and platform
   */
  const filteredMessages = useMemo(() => {
    let result = messages;

    // Filter by platform
    if (platformFilter) {
      result = result.filter((m) => m.platform === platformFilter);
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter(
        (m) =>
          m.message.toLowerCase().includes(search) ||
          m.username.toLowerCase().includes(search) ||
          m.displayName.toLowerCase().includes(search)
      );
    }

    return result;
  }, [messages, searchTerm, platformFilter]);

  return {
    messages,
    addMessage,
    clearMessages,
    filteredMessages,
    searchTerm,
    setSearchTerm,
    platformFilter,
    setPlatformFilter,
    messageCount: messages.length,
  };
}

/**
 * Check if a message matches any highlight rules
 */
export function getMessageHighlights(
  message: ChatMessage,
  rules: HighlightRule[]
): { keyword: HighlightRule | null; role: "mod" | "broadcaster" | "vip" | "subscriber" | null } {
  // Check role-based highlights first
  let role: "mod" | "broadcaster" | "vip" | "subscriber" | null = null;
  if (message.metadata?.isBroadcaster) {
    role = "broadcaster";
  } else if (message.metadata?.isMod) {
    role = "mod";
  } else if (message.metadata?.isVip) {
    role = "vip";
  } else if (message.metadata?.isSubscriber) {
    role = "subscriber";
  }

  // Check keyword highlights
  let keywordMatch: HighlightRule | null = null;
  const messageLower = message.message.toLowerCase();
  const usernameLower = message.username.toLowerCase();
  const displayNameLower = message.displayName.toLowerCase();

  for (const rule of rules) {
    if (!rule.enabled) continue;

    const keywordLower = rule.keyword.toLowerCase();
    if (
      messageLower.includes(keywordLower) ||
      usernameLower.includes(keywordLower) ||
      displayNameLower.includes(keywordLower)
    ) {
      keywordMatch = rule;
      break;
    }
  }

  return { keyword: keywordMatch, role };
}

/**
 * Get CSS classes for message highlighting based on role
 */
export function getRoleHighlightClasses(
  role: "mod" | "broadcaster" | "vip" | "subscriber" | null
): string {
  switch (role) {
    case "broadcaster":
      return "bg-red-500/10 border-l-2 border-red-500";
    case "mod":
      return "bg-green-500/10 border-l-2 border-green-500";
    case "vip":
      return "bg-purple-500/10 border-l-2 border-purple-500";
    case "subscriber":
      return ""; // Subscribers get badge but no background highlight
    default:
      return "";
  }
}

/**
 * Get username color class based on role
 */
export function getUsernameColorClass(
  role: "mod" | "broadcaster" | "vip" | "subscriber" | null,
  userColor?: string
): string {
  // If user has a custom color set, we'll apply it inline
  // This function returns fallback classes for roles
  switch (role) {
    case "broadcaster":
      return "text-red-400";
    case "mod":
      return "text-green-400";
    case "vip":
      return "text-purple-400";
    case "subscriber":
      return "text-blue-400";
    default:
      return "text-foreground";
  }
}

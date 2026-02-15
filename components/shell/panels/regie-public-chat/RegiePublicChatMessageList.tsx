"use client";

import { useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ArrowDown, MessageSquare, Star, Monitor, Loader2, MoreVertical, Trash2, Clock, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getMessageHighlights,
  getRoleHighlightClasses,
  getUsernameColorClass,
} from "@/components/presenter/hooks/useStreamerbotMessages";
import { ChatBadge } from "@/components/presenter/chat/ChatBadge";
import { ChatMessageContent } from "@/components/presenter/chat/ChatMessageContent";
import { ChatEventMessage } from "@/components/presenter/chat/ChatEventMessage";
import { PlatformIcon } from "@/components/presenter/chat/PlatformIcon";
import type { RegiePublicChatMessageListProps, ChatMessage, ModerationAction } from "./types";
import { StreamerbotConnectionStatus } from "./types";

/**
 * Format timestamp for display
 */
function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Single chat message row component with highlight and overlay buttons
 */
function ChatMessageRow({
  message,
  preferences,
  virtualItem,
  onHighlight,
  isHighlighting,
  onShowInOverlay,
  isShowingInOverlay,
  isCurrentlyDisplayed,
  measureRef,
  onModerate,
  isModerating,
}: {
  message: ChatMessage;
  preferences: RegiePublicChatMessageListProps["preferences"];
  virtualItem: { size: number; start: number; index: number };
  onHighlight: () => void;
  isHighlighting: boolean;
  onShowInOverlay: () => void;
  isShowingInOverlay: boolean;
  isCurrentlyDisplayed: boolean;
  measureRef: (node: HTMLDivElement | null) => void;
  onModerate?: (action: ModerationAction, duration?: number) => void;
  isModerating?: boolean;
}) {
  const t = useTranslations("presenter");
  // Event messages (follow, sub, raid, etc.)
  if (message.eventType !== "message") {
    return (
      <div
        ref={measureRef}
        data-index={virtualItem.index}
        className="absolute top-0 left-0 w-full px-2"
        style={{
          transform: `translateY(${virtualItem.start}px)`,
        }}
      >
        <ChatEventMessage message={message} compact={preferences.compactMode} />
      </div>
    );
  }

  // Regular chat message with badges and emotes
  const highlights = getMessageHighlights(message, preferences.highlightRules);
  const roleClasses = getRoleHighlightClasses(highlights.role);
  const usernameClass = getUsernameColorClass(
    highlights.role,
    message.metadata?.color
  );

  return (
    <div
      ref={measureRef}
      data-index={virtualItem.index}
      className={cn(
        "absolute top-0 left-0 w-full px-2 py-1 group transition-colors",
        "hover:bg-muted/50",
        roleClasses,
        highlights.keyword && `border-l-2`,
        message.metadata?.isHighlighted && "bg-purple-500/10",
        preferences.compactMode ? "text-xs" : "text-sm"
      )}
      style={{
        transform: `translateY(${virtualItem.start}px)`,
        borderLeftColor: highlights.keyword?.color,
      }}
    >
      {/* Reply indicator */}
      {message.metadata?.isReply && message.metadata.replyTo && (
        <div className="text-[10px] text-muted-foreground mb-0.5 truncate flex items-center gap-1">
          <PlatformIcon platform={message.platform} size="sm" />
          <span>Replying to @{message.metadata.replyTo.displayName}</span>
        </div>
      )}

      <div className="flex items-start gap-1.5">
        {/* Timestamp */}
        {preferences.showTimestamps && (
          <span className="text-muted-foreground text-[10px] shrink-0 pt-0.5">
            {formatTime(message.timestamp)}
          </span>
        )}

        {/* Platform icon and Badges */}
        {(!message.metadata?.isReply ||
          (message.metadata?.badges && message.metadata.badges.length > 0)) && (
          <div className="flex items-center gap-0.5 shrink-0 pt-0.5">
            {!message.metadata?.isReply && (
              <PlatformIcon platform={message.platform} size="sm" />
            )}
            {message.metadata?.badges && message.metadata.badges.length > 0 && (
              <>
                {message.metadata.badges.map((badge, idx) => (
                  <ChatBadge
                    key={`${badge.name}-${idx}`}
                    badge={badge}
                    size="sm"
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* Username */}
        <span
          className={cn("font-medium shrink-0", usernameClass)}
          style={
            message.metadata?.color && !highlights.role
              ? { color: message.metadata.color }
              : undefined
          }
        >
          {message.displayName}:
        </span>

        {/* Message content with emotes */}
        <ChatMessageContent
          parts={message.parts}
          fallbackText={message.message}
          isMe={message.metadata?.isMe}
          className="wrap-break-word min-w-0 flex-1"
        />

        {/* Action buttons (visible on hover) */}
        <div className="flex items-center gap-0.5 shrink-0">
          {/* Show in Overlay button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
              (isShowingInOverlay || isCurrentlyDisplayed) && "opacity-100",
              isCurrentlyDisplayed && "text-green-500"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onShowInOverlay();
            }}
            disabled={isShowingInOverlay}
            title={isCurrentlyDisplayed ? "Currently on overlay" : "Show in overlay"}
          >
            {isShowingInOverlay ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Monitor className="h-3 w-3" />
            )}
          </Button>

          {/* Highlight button - send to presenter */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
              isHighlighting && "opacity-100"
            )}
            onClick={(e) => {
              e.stopPropagation();
              onHighlight();
            }}
            disabled={isHighlighting}
            title="Send to presenter"
          >
            {isHighlighting ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Star className="h-3 w-3" />
            )}
          </Button>

          {/* Moderation dropdown (Twitch only) */}
          {onModerate && message.platform === "twitch" && message.metadata?.twitchUserId && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity",
                    isModerating && "opacity-100"
                  )}
                  disabled={isModerating}
                >
                  {isModerating ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <MoreVertical className="h-3 w-3" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onModerate("delete");
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("chat.moderation.delete")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onModerate("timeout", 60);
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {t("chat.moderation.timeout1m")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onModerate("timeout", 600);
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {t("chat.moderation.timeout10m")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onModerate("timeout", 3600);
                  }}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {t("chat.moderation.timeout1h")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onModerate("ban");
                  }}
                  className="text-destructive focus:text-destructive"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  {t("chat.moderation.ban")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Virtualized message list component with highlight and overlay functionality
 */
export function RegiePublicChatMessageList({
  messages,
  preferences,
  status,
  isAtBottom,
  onScrollChange,
  onScrollToBottom,
  onHighlightMessage,
  highlightingMessageId,
  onShowInOverlay,
  showingInOverlayId,
  currentlyDisplayedId,
  onModerate,
  moderateLoadingId,
}: RegiePublicChatMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Virtual list configuration with dynamic row heights
  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => (preferences.compactMode ? 28 : 44),
    overscan: 10,
    measureElement: (element) => element?.getBoundingClientRect().height ?? (preferences.compactMode ? 28 : 44),
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isAtBottom && messages.length > 0 && preferences.autoScroll) {
      rowVirtualizer.scrollToIndex(messages.length - 1, {
        align: "end",
        behavior: "smooth",
      });
    }
  }, [messages.length, isAtBottom, preferences.autoScroll, rowVirtualizer]);

  // Handle scroll to detect if user is at bottom
  const handleScroll = useCallback(() => {
    const parent = parentRef.current;
    if (!parent) return;

    const { scrollTop, scrollHeight, clientHeight } = parent;
    const threshold = 50;
    const atBottom = scrollHeight - scrollTop - clientHeight < threshold;
    onScrollChange(atBottom);
  }, [onScrollChange]);

  // Scroll to bottom handler
  const handleScrollToBottom = useCallback(() => {
    if (messages.length > 0) {
      rowVirtualizer.scrollToIndex(messages.length - 1, {
        align: "end",
        behavior: "smooth",
      });
      onScrollToBottom();
    }
  }, [messages.length, rowVirtualizer, onScrollToBottom]);

  return (
    <>
      <div
        ref={parentRef}
        className="flex-1 overflow-auto min-h-0"
        onScroll={handleScroll}
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-50" />
              <p className="text-xs">
                {status === StreamerbotConnectionStatus.CONNECTED
                  ? "Waiting for messages..."
                  : "Connect to see chat messages"}
              </p>
            </div>
          </div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualItem) => {
              const message = messages[virtualItem.index];
              return (
                <ChatMessageRow
                  key={message.id}
                  message={message}
                  preferences={preferences}
                  virtualItem={virtualItem}
                  onHighlight={() => onHighlightMessage(message)}
                  isHighlighting={highlightingMessageId === message.id}
                  onShowInOverlay={() => onShowInOverlay(message)}
                  isShowingInOverlay={showingInOverlayId === message.id}
                  isCurrentlyDisplayed={currentlyDisplayedId === message.id}
                  measureRef={rowVirtualizer.measureElement}
                  onModerate={onModerate ? (action, duration) => onModerate(message, action, duration) : undefined}
                  isModerating={moderateLoadingId === message.id}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!isAtBottom && messages.length > 0 && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute bottom-4 right-4 h-8 shadow-md"
          onClick={handleScrollToBottom}
        >
          <ArrowDown className="h-4 w-4 mr-1" />
          New messages
        </Button>
      )}
    </>
  );
}

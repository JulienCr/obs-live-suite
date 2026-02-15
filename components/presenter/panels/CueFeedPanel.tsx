"use client";

import { useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Pin } from "lucide-react";
import { CueCard } from "../CueCard";
import type { CueMessage, CueAction } from "@/lib/models/Cue";
import type { OverlayState } from "../hooks/useOverlayState";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CueFeedPanelProps {
  messages: CueMessage[];
  pinnedMessages: CueMessage[];
  onAction: (messageId: string, action: CueAction) => void;
  isPresenter: boolean;
  overlayState?: OverlayState;
  onShowInOverlay?: (message: CueMessage) => void;
  showingInOverlayId?: string | null;
  currentlyDisplayedId?: string | null;
}

export function CueFeedPanel({
  messages,
  pinnedMessages,
  onAction,
  isPresenter,
  overlayState,
  onShowInOverlay,
  showingInOverlayId,
  currentlyDisplayedId,
}: CueFeedPanelProps) {
  const t = useTranslations("presenter");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  }, [messages.length]);

  const hasPinned = pinnedMessages.length > 0;

  return (
    <div className="h-full flex flex-col">
      {/* Pinned Section */}
      {hasPinned && (
        <div className="shrink-0 border-b bg-muted/30">
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
            <Pin className="h-3 w-3" />
            <span>{t("labels.pinned")}</span>
          </div>
          <div className="px-3 pb-2 space-y-2">
            {pinnedMessages.map((message) => (
              <CueCard
                key={message.id}
                message={message}
                onAction={onAction}
                isPresenter={isPresenter}
                compact
                overlayState={overlayState}
                onShowInOverlay={onShowInOverlay}
                isShowingInOverlay={showingInOverlayId === message.id}
                isCurrentlyDisplayed={currentlyDisplayedId === message.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Message Feed */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="p-3 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm py-8">
              {t("emptyStates.noMessages")}
            </div>
          ) : (
            messages
              .filter(m => !m.pinned) // Don't show pinned in main feed
              .map((message) => (
                <CueCard
                  key={message.id}
                  message={message}
                  onAction={onAction}
                  isPresenter={isPresenter}
                  overlayState={overlayState}
                  onShowInOverlay={onShowInOverlay}
                  isShowingInOverlay={showingInOverlayId === message.id}
                  isCurrentlyDisplayed={currentlyDisplayedId === message.id}
                />
              ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

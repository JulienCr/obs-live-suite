"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  AlertCircle,
  AlertTriangle,
  Info,
  Clock,
  HelpCircle,
  FileText,
  MessageSquare,
  Check,
  X,
  Pin,
  CheckCheck,
  Play,
  StopCircle,
  Monitor,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CueType, CueSeverity, CueAction, CueFrom } from "@/lib/models/Cue";
import type { CueMessage } from "@/lib/models/Cue";
import type { OverlayState } from "./hooks/useOverlayState";
import { ChatBadge as ChatBadgeComponent } from "./chat/ChatBadge";
import { ChatMessageContent } from "./chat/ChatMessageContent";

interface CueCardProps {
  message: CueMessage;
  onAction: (messageId: string, action: CueAction) => void;
  isPresenter: boolean;
  compact?: boolean;
  overlayState?: OverlayState;
  onShowInOverlay?: (message: CueMessage) => void;
  isShowingInOverlay?: boolean;
  isCurrentlyDisplayed?: boolean;
}

const typeIcons: Record<CueType, React.ComponentType<{ className?: string }>> = {
  [CueType.CUE]: AlertCircle,
  [CueType.COUNTDOWN]: Clock,
  [CueType.QUESTION]: HelpCircle,
  [CueType.CONTEXT]: FileText,
  [CueType.NOTE]: FileText,
  [CueType.REPLY]: MessageSquare,
};

const severityStyles: Record<CueSeverity, string> = {
  [CueSeverity.INFO]: "border-blue-500/50 bg-blue-500/5",
  [CueSeverity.WARN]: "border-yellow-500/50 bg-yellow-500/5",
  [CueSeverity.URGENT]: "border-red-500/50 bg-red-500/5 animate-pulse",
};

const severityIcons: Record<CueSeverity, React.ComponentType<{ className?: string }>> = {
  [CueSeverity.INFO]: Info,
  [CueSeverity.WARN]: AlertTriangle,
  [CueSeverity.URGENT]: AlertCircle,
};

const fromStyles: Record<CueFrom, string> = {
  [CueFrom.CONTROL]: "border-l-4 border-l-blue-500",
  [CueFrom.PRESENTER]: "border-l-4 border-l-green-500",
  [CueFrom.SYSTEM]: "border-l-4 border-l-gray-500",
};

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

/**
 * Countdown timer component that ticks every second
 */
function CountdownTimer({
  createdAt,
  durationSec
}: {
  createdAt: number;
  durationSec: number;
}) {
  const [remaining, setRemaining] = useState(() => {
    const elapsed = Math.floor((Date.now() - createdAt) / 1000);
    return Math.max(0, durationSec - elapsed);
  });

  useEffect(() => {
    if (remaining <= 0) return;

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - createdAt) / 1000);
      const newRemaining = Math.max(0, durationSec - elapsed);
      setRemaining(newRemaining);

      if (newRemaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [createdAt, durationSec, remaining]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isExpired = remaining <= 0;
  const isUrgent = remaining <= 10 && remaining > 0;

  return (
    <div className={cn(
      "text-2xl font-mono font-bold transition-colors",
      isExpired && "text-muted-foreground",
      isUrgent && "text-red-500 animate-pulse"
    )}>
      {isExpired ? "00:00" : `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`}
    </div>
  );
}

export function CueCard({ message, onAction, isPresenter, compact, overlayState, onShowInOverlay, isShowingInOverlay, isCurrentlyDisplayed }: CueCardProps) {
  const t = useTranslations("presenter");
  const TypeIcon = typeIcons[message.type as CueType] || FileText;
  const severity = message.severity as CueSeverity | undefined;
  const SeverityIcon = severity ? severityIcons[severity] : null;
  const isResolved = message.resolvedAt !== null;
  const isAcked = message.ackedBy.length > 0;
  const isQuestion = message.type === CueType.QUESTION;
  const isFromControl = message.from === CueFrom.CONTROL;
  const isFromSystem = message.from === CueFrom.SYSTEM;

  const cardStyle = cn(
    "relative transition-all",
    fromStyles[message.from as CueFrom],
    severity && severityStyles[severity],
    isResolved && "opacity-50",
    isAcked && !isResolved && "opacity-30",
    message.pinned && "border-primary/50"
  );

  const handleCardClick = () => {
    // Only handle acknowledgment for presenter on unacknowledged messages
    if (isPresenter && !isAcked && !isResolved) {
      onAction(message.id, CueAction.ACK);
    }
  };

  // Check if content is currently on screen
  const isContentOnScreen = (() => {
    if (!overlayState || message.type !== CueType.CONTEXT) return false;
    const ctx = message.contextPayload;
    if (!ctx) return false;

    // Check if this is a guest notification - use guestId from payload
    if (ctx.guestId && overlayState.lowerThird.active) {
      return overlayState.lowerThird.guestId === ctx.guestId;
    }

    // Check if this is a poster notification - use posterId from payload
    if (ctx.posterId && overlayState.poster.active) {
      return overlayState.poster.posterId === ctx.posterId;
    }

    return false;
  })();

  return (
    <Card
      className={cn(
        cardStyle,
        isPresenter && !isAcked && !isResolved && "cursor-pointer hover:border-primary/50"
      )}
      onClick={handleCardClick}
    >
      <CardHeader className={cn("pb-2", compact && "py-2")}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {/* Type icon */}
            <TypeIcon className={cn(
              "h-4 w-4",
              severity === CueSeverity.URGENT && "text-red-500",
              severity === CueSeverity.WARN && "text-yellow-500",
              severity === CueSeverity.INFO && "text-blue-500"
            )} />

            {/* Title - for questions show "Highlight" */}
            {isQuestion ? (
              <span className="font-medium text-sm">{t("labels.highlight")}</span>
            ) : message.title ? (
              <span className="font-medium text-sm">{message.title}</span>
            ) : null}

            {/* Severity badge */}
            {SeverityIcon && (
              <Badge variant={severity === CueSeverity.URGENT ? "destructive" : "outline-solid"} className="text-xs">
                <SeverityIcon className="h-3 w-3 mr-1" />
                {severity}
              </Badge>
            )}

            {/* Pin indicator */}
            {message.pinned && (
              <Pin className="h-3 w-3 text-primary" aria-label="Pinned" />
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {/* Acked indicator */}
            {isAcked && (
              <CheckCheck className="h-3 w-3 text-green-500" aria-label="Acknowledged" />
            )}

            {/* Source - hide for questions */}
            {!isQuestion && (
              <span>
                {isFromControl
                  ? t("labels.controlRoom")
                  : isFromSystem
                    ? t("labels.system")
                    : t("labels.presenter")}
              </span>
            )}

            {/* Timestamp */}
            <span>{formatTimestamp(message.createdAt)}</span>

            {/* Play/Stop indicator for content notifications */}
            {message.type === CueType.CONTEXT &&
             message.contextPayload &&
             (message.contextPayload.guestId || message.contextPayload.posterId) && (
              <div
                className="flex items-center gap-1"
                title={isContentOnScreen ? t("cueCard.onScreen") : t("cueCard.offScreen")}
              >
                {isContentOnScreen ? (
                  <Play className="h-3 w-3 text-green-500 fill-green-500" />
                ) : (
                  <StopCircle className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pb-2", compact && "py-1")}>
        {/* Question-specific content - Twitch format */}
        {isQuestion && message.questionPayload && (
          <div className="flex flex-wrap items-start gap-1 text-sm">
            {/* Badges */}
            {message.questionPayload.badges && message.questionPayload.badges.length > 0 && (
              <>
                {message.questionPayload.badges.map((badge, idx) => (
                  <ChatBadgeComponent
                    key={`${badge.name}-${idx}`}
                    badge={badge}
                    size="sm"
                  />
                ))}
              </>
            )}
            {/* Username with color */}
            <span
              className="font-bold"
              style={{ color: message.questionPayload.color || undefined }}
            >
              {message.questionPayload.author}:
            </span>
            {/* Message with emotes */}
            <ChatMessageContent
              parts={message.questionPayload.parts}
              fallbackText={message.questionPayload.text}
              className="wrap-break-word"
            />
          </div>
        )}

        {/* Body - hide for QUESTION type and CONTEXT with image */}
        {message.body && !isQuestion && !(message.type === CueType.CONTEXT && message.contextPayload?.imageUrl) && (
          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        )}

        {/* Context-specific content - TWO COLUMN LAYOUT */}
        {message.type === CueType.CONTEXT && message.contextPayload && (
          <div
            className={cn(
              "mt-2",
              message.contextPayload.imageUrl
                ? "grid grid-cols-[auto_1fr] gap-3 items-start"
                : "space-y-2"
            )}
          >
            {/* Left column: Image (max 128px wide, auto height, supports various ratios) */}
            {message.contextPayload.imageUrl && (
              <div className="shrink-0">
                <img
                  src={message.contextPayload.imageUrl}
                  alt="Context"
                  className="max-w-32 h-auto max-h-24 rounded object-contain"
                />
              </div>
            )}

            {/* Right column: Text content */}
            <div className="space-y-2 min-w-0">
              {/* Body text */}
              {message.body && message.contextPayload.imageUrl && (
                <p className="text-sm whitespace-pre-wrap">{message.body}</p>
              )}

              {/* Bullets - displayed as simple paragraphs */}
              {message.contextPayload.bullets && message.contextPayload.bullets.length > 0 && (
                <div className="text-sm space-y-1 text-muted-foreground">
                  {message.contextPayload.bullets.map((bullet, i) => (
                    <p key={i} className="truncate" title={bullet}>
                      {bullet}
                    </p>
                  ))}
                </div>
              )}

              {/* Links */}
              {message.contextPayload.links && message.contextPayload.links.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.contextPayload.links.map((link, i) => (
                    <a
                      key={i}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {link.title || link.url}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Countdown-specific content */}
        {message.type === CueType.COUNTDOWN && message.countdownPayload && (
          <div className="mt-2 text-center">
            {message.countdownPayload.mode === "duration" && message.countdownPayload.durationSec ? (
              <CountdownTimer
                createdAt={message.createdAt}
                durationSec={message.countdownPayload.durationSec}
              />
            ) : (
              <div className="text-2xl font-mono font-bold">
                {message.countdownPayload.targetTime}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Actions - Always show for control room, hide for presenter if resolved/compact */}
      {(!isResolved || !isPresenter) && (!compact || !isPresenter) && (
        <CardFooter className={cn("pt-0 pb-2 gap-2", compact && "pb-1")}>
          {/* Presenter actions */}
          {isPresenter && (
            <>
              {!isAcked && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAction(message.id, CueAction.ACK);
                  }}
                >
                  <Check className="h-3 w-3 mr-1" />
                  {t("actions.ok")}
                </Button>
              )}

              {isQuestion && (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(message.id, CueAction.TAKE);
                      // Also show in overlay when taking a question
                      if (onShowInOverlay) {
                        onShowInOverlay(message);
                      }
                    }}
                  >
                    {t("actions.take")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(message.id, CueAction.SKIP);
                    }}
                  >
                    {t("actions.skip")}
                  </Button>
                </>
              )}
            </>
          )}

          {/* Control room actions */}
          {!isPresenter && (
            <>
              {/* Show in overlay button for questions */}
              {isQuestion && onShowInOverlay && (
                <Button
                  variant={isCurrentlyDisplayed ? "default" : "outline-solid"}
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onShowInOverlay(message);
                  }}
                  disabled={isShowingInOverlay}
                  title={isCurrentlyDisplayed ? t("cueCard.hideFromOverlay") : t("cueCard.showInOverlay")}
                >
                  {isShowingInOverlay ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Monitor className={cn("h-3 w-3", isCurrentlyDisplayed && "text-green-500")} />
                  )}
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(message.id, message.pinned ? CueAction.UNPIN : CueAction.PIN);
                }}
              >
                <Pin className={cn("h-3 w-3", message.pinned && "text-primary")} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(message.id, CueAction.CLEAR);
                }}
                title={t("cueCard.deleteMessage")}
              >
                <X className="h-3 w-3" />
              </Button>
            </>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

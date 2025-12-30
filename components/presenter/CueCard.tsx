"use client";

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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CueType, CueSeverity, CueAction, CueFrom } from "@/lib/models/Cue";
import type { CueMessage } from "@/lib/models/Cue";
import type { OverlayState } from "./hooks/useOverlayState";

interface CueCardProps {
  message: CueMessage;
  onAction: (messageId: string, action: CueAction) => void;
  isPresenter: boolean;
  compact?: boolean;
  overlayState?: OverlayState;
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

function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function CueCard({ message, onAction, isPresenter, compact, overlayState }: CueCardProps) {
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

            {/* Title */}
            {message.title && (
              <span className="font-medium text-sm">{message.title}</span>
            )}

            {/* Severity badge */}
            {SeverityIcon && (
              <Badge variant={severity === CueSeverity.URGENT ? "destructive" : "outline"} className="text-xs">
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

            {/* Source */}
            <span>{isFromControl ? "Control" : isFromSystem ? "System" : "Presenter"}</span>

            {/* Timestamp */}
            <span>{formatTimestamp(message.createdAt)}</span>

            {/* Play/Stop indicator for content notifications */}
            {message.type === CueType.CONTEXT &&
             message.contextPayload &&
             (message.contextPayload.guestId || message.contextPayload.posterId) && (
              <div
                className="flex items-center gap-1"
                title={isContentOnScreen ? "À l'écran" : "Hors écran"}
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
        {/* Body - show only if NOT a CONTEXT type with image */}
        {message.body && !(message.type === CueType.CONTEXT && message.contextPayload?.imageUrl) && (
          <p className="text-sm whitespace-pre-wrap">{message.body}</p>
        )}

        {/* Question-specific content */}
        {isQuestion && message.questionPayload && (
          <div className="mt-2 p-2 bg-muted rounded text-sm">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <span className="font-medium">@{message.questionPayload.author}</span>
              <span className="text-xs">on {message.questionPayload.platform}</span>
            </div>
            <p className="italic">&ldquo;{message.questionPayload.text}&rdquo;</p>
          </div>
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
            {/* Left column: Image (80x80px) */}
            {message.contextPayload.imageUrl && (
              <div className="flex-shrink-0">
                <img
                  src={message.contextPayload.imageUrl}
                  alt="Context"
                  className="w-20 h-20 rounded object-cover"
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
            <div className="text-2xl font-mono font-bold">
              {message.countdownPayload.mode === "duration"
                ? `${Math.floor((message.countdownPayload.durationSec || 0) / 60)}:${String((message.countdownPayload.durationSec || 0) % 60).padStart(2, "0")}`
                : message.countdownPayload.targetTime
              }
            </div>
          </div>
        )}
      </CardContent>

      {/* Actions */}
      {!isResolved && !compact && (
        <CardFooter className="pt-0 pb-2 gap-2">
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
                  OK
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
                    }}
                  >
                    Take
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAction(message.id, CueAction.SKIP);
                    }}
                  >
                    Skip
                  </Button>
                </>
              )}
            </>
          )}

          {/* Control room actions */}
          {!isPresenter && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(message.id, message.pinned ? CueAction.UNPIN : CueAction.PIN);
                }}
              >
                <Pin className={cn("h-3 w-3 mr-1", message.pinned && "text-primary")} />
                {message.pinned ? "Unpin" : "Pin"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onAction(message.id, CueAction.DONE);
                }}
              >
                <X className="h-3 w-3 mr-1" />
                Done
              </Button>
            </>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

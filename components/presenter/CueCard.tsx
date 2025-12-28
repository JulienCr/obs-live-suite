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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CueType, CueSeverity, CueAction, CueFrom } from "@/lib/models/Cue";
import type { CueMessage } from "@/lib/models/Cue";

interface CueCardProps {
  message: CueMessage;
  onAction: (messageId: string, action: CueAction) => void;
  isPresenter: boolean;
  compact?: boolean;
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

export function CueCard({ message, onAction, isPresenter, compact }: CueCardProps) {
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
    message.pinned && "border-primary/50"
  );

  return (
    <Card className={cardStyle}>
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
          </div>
        </div>
      </CardHeader>

      <CardContent className={cn("pb-2", compact && "py-1")}>
        {/* Body */}
        {message.body && (
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

        {/* Context-specific content */}
        {message.type === CueType.CONTEXT && message.contextPayload && (
          <div className="mt-2 space-y-2">
            {message.contextPayload.imageUrl && (
              <img
                src={message.contextPayload.imageUrl}
                alt="Context"
                className="max-h-32 rounded object-cover"
              />
            )}
            {message.contextPayload.bullets && message.contextPayload.bullets.length > 0 && (
              <ul className="list-disc list-inside text-sm space-y-1">
                {message.contextPayload.bullets.map((bullet, i) => (
                  <li key={i}>{bullet}</li>
                ))}
              </ul>
            )}
            {message.contextPayload.links && message.contextPayload.links.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {message.contextPayload.links.map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                  >
                    {link.title || link.url}
                  </a>
                ))}
              </div>
            )}
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
                  onClick={() => onAction(message.id, CueAction.ACK)}
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
                    onClick={() => onAction(message.id, CueAction.TAKE)}
                  >
                    Take
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAction(message.id, CueAction.SKIP)}
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
                onClick={() => onAction(message.id, message.pinned ? CueAction.UNPIN : CueAction.PIN)}
              >
                <Pin className={cn("h-3 w-3 mr-1", message.pinned && "text-primary")} />
                {message.pinned ? "Unpin" : "Pin"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction(message.id, CueAction.DONE)}
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

"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  StopCircle,
  RefreshCw,
  User,
  Image,
  MessageSquare,
  FileText,
  Radio,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { useEventLog, EventSource } from "@/hooks/useEventLog";
import {
  EventLogType,
  EventLogFilter,
  EventLogEntry,
} from "@/lib/models/EventLog";

function FilterButtons({
  filter,
  onFilterChange,
}: {
  filter: EventLogFilter;
  onFilterChange: (f: EventLogFilter) => void;
}) {
  const t = useTranslations("dashboard.eventLog");

  const filters: { value: EventLogFilter; label: string }[] = [
    { value: "all", label: t("filters.all") },
    { value: EventLogType.GUEST, label: t("filters.guests") },
    { value: EventLogType.POSTER, label: t("filters.posters") },
    { value: EventLogType.CHAT_HIGHLIGHT, label: t("filters.chat") },
    { value: EventLogType.CUSTOM_TEXT, label: t("filters.custom") },
  ];

  return (
    <div className="flex gap-1 flex-wrap">
      {filters.map((f) => (
        <Button
          key={f.value}
          variant={filter === f.value ? "default" : "outline-solid"}
          size="sm"
          onClick={() => onFilterChange(f.value)}
          className="text-xs px-2 h-6"
        >
          {f.label}
        </Button>
      ))}
    </div>
  );
}

function EventTypeIcon({ type }: { type: EventLogType }) {
  switch (type) {
    case EventLogType.GUEST:
      return <User className="w-3 h-3" />;
    case EventLogType.POSTER:
      return <Image className="w-3 h-3" />;
    case EventLogType.CHAT_HIGHLIGHT:
      return <MessageSquare className="w-3 h-3" />;
    case EventLogType.CUSTOM_TEXT:
      return <FileText className="w-3 h-3" />;
  }
}

function SideBadge({ side }: { side?: string }) {
  const t = useTranslations("dashboard.eventLog");

  if (!side) return null;

  const sideKey = side as "left" | "right" | "center" | "big";
  const label = t(`sides.${sideKey}`);

  return (
    <Badge variant="secondary" className="text-[9px] px-1 py-0 uppercase">
      {label}
    </Badge>
  );
}

function EventRow({
  entry,
  onStop,
  onReplay,
  onRemove,
}: {
  entry: EventLogEntry;
  onStop: () => void;
  onReplay: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("dashboard.eventLog");

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div
      className={cn(
        "flex items-start gap-2 text-xs border rounded-lg p-2 transition-all",
        entry.isActive
          ? "border-green-500 bg-green-50 dark:bg-green-950/20"
          : "border-border"
      )}
    >
      {/* Time and type icon */}
      <div className="flex flex-col items-center gap-1 min-w-[50px]">
        <span className="text-[10px] text-muted-foreground font-mono">
          {formatTime(entry.timestamp)}
        </span>
        <div
          className={cn(
            "p-1 rounded",
            entry.isActive ? "bg-green-500 text-white" : "bg-muted"
          )}
        >
          <EventTypeIcon type={entry.type} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-medium truncate">{entry.display.title}</span>
          <SideBadge side={entry.display.side} />
          {entry.from === EventSource.PRESENTER && (
            <Badge variant="outline" className="text-[9px] px-1 py-0">
              <Radio className="w-2 h-2 mr-0.5" />
              {t("fromPresenter")}
            </Badge>
          )}
        </div>
        {entry.display.subtitle && (
          <div className="text-muted-foreground truncate">
            {entry.display.subtitle}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-1">
        {entry.isActive ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={onStop}
            className="h-6 px-2 text-[10px]"
          >
            <StopCircle className="w-3 h-3 mr-1" />
            {t("stop")}
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={onReplay}
            className="h-6 px-2 text-[10px]"
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            {t("replay")}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="h-6 w-6 p-0"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    </div>
  );
}

/**
 * EventLog - Display and manage overlay events
 */
export function EventLog() {
  const t = useTranslations("dashboard.eventLog");
  const {
    filteredEvents,
    filter,
    setFilter,
    clearAll,
    removeEvent,
    stopOverlay,
    replayOverlay,
    isConnected,
  } = useEventLog();

  return (
    <div className="flex flex-col h-full">
      {/* Header with filters and clear button */}
      <div className="shrink-0 space-y-2 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Connection indicator */}
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}
            />
            <FilterButtons filter={filter} onFilterChange={setFilter} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            disabled={filteredEvents.length === 0}
            className="h-6 text-xs"
          >
            <Trash2 className="w-3 h-3 mr-1" />
            {t("clearAll")}
          </Button>
        </div>
      </div>

      {/* Scrollable event list */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {filteredEvents.length > 0 ? (
          <div className="space-y-2 pr-2">
            {filteredEvents.map((entry) => (
              <EventRow
                key={entry.id}
                entry={entry}
                onStop={() => stopOverlay(entry)}
                onReplay={() => replayOverlay(entry)}
                onRemove={() => removeEvent(entry.id)}
              />
            ))}
          </div>
        ) : (
          <div className="text-sm text-muted-foreground text-center py-8">
            {t("noEvents")}
          </div>
        )}
      </div>
    </div>
  );
}

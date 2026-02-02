"use client";

import { useRef, useState, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils/cn";
import type { VideoChapter } from "@/lib/models/Poster";

export interface VideoTimelineProps {
  duration: number; // Total video duration in seconds
  chapters?: VideoChapter[]; // Chapter markers
  currentTime?: number; // Current playback position
  onSeek?: (time: number) => void; // Callback when user clicks on timeline
  onChapterClick?: (chapter: VideoChapter) => void; // Callback when clicking a chapter marker
  selectionRange?: { start: number; end: number } | null; // For sub-video range selection
  onSelectionChange?: (range: { start: number; end: number }) => void; // Callback for range changes
  readOnly?: boolean; // Disable interactions
  className?: string;
}

/**
 * Format seconds to human-readable time string
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Calculate time marker interval based on duration
 */
function getMarkerInterval(duration: number): number {
  if (duration <= 60) return 10; // 10s intervals for short videos
  if (duration <= 300) return 30; // 30s intervals for medium videos
  if (duration <= 600) return 60; // 1min intervals
  if (duration <= 1800) return 120; // 2min intervals
  return 300; // 5min intervals for long videos
}

/**
 * VideoTimeline component for video navigation and selection
 */
export function VideoTimeline({
  duration,
  chapters = [],
  currentTime = 0,
  onSeek,
  onChapterClick,
  selectionRange,
  onSelectionChange,
  readOnly = false,
  className,
}: VideoTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);

  // Calculate position percentage for a given time
  const timeToPercent = useCallback(
    (time: number) => (duration > 0 ? (time / duration) * 100 : 0),
    [duration]
  );

  // Calculate time from a position in the container
  const positionToTime = useCallback(
    (clientX: number): number => {
      if (!containerRef.current || duration <= 0) return 0;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
      return (percent / 100) * duration;
    },
    [duration]
  );

  // Time markers
  const markers = useMemo(() => {
    if (duration <= 0) return [];
    const interval = getMarkerInterval(duration);
    const result: { time: number; label: string }[] = [];
    for (let t = 0; t <= duration; t += interval) {
      result.push({ time: t, label: formatTime(t) });
    }
    // Add final marker if not already included
    if (result.length === 0 || result[result.length - 1].time < duration) {
      result.push({ time: duration, label: formatTime(duration) });
    }
    return result;
  }, [duration]);

  // Sorted chapters
  const sortedChapters = useMemo(
    () => [...chapters].sort((a, b) => a.timestamp - b.timestamp),
    [chapters]
  );

  // Handle mouse move for hover preview and dragging
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const time = positionToTime(e.clientX);
      setHoverTime(time);

      if (dragging && selectionRange && onSelectionChange) {
        if (dragging === "start") {
          onSelectionChange({
            start: Math.min(time, selectionRange.end - 1),
            end: selectionRange.end,
          });
        } else {
          onSelectionChange({
            start: selectionRange.start,
            end: Math.max(time, selectionRange.start + 1),
          });
        }
      }
    },
    [positionToTime, dragging, selectionRange, onSelectionChange]
  );

  // Handle click on timeline
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (readOnly || dragging) return;
      const time = positionToTime(e.clientX);
      onSeek?.(time);
    },
    [readOnly, dragging, positionToTime, onSeek]
  );

  // Handle drag start for selection handles
  const handleDragStart = useCallback(
    (handle: "start" | "end") => (e: React.MouseEvent) => {
      if (readOnly) return;
      e.stopPropagation();
      setDragging(handle);
    },
    [readOnly]
  );

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    setDragging(null);
  }, []);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoverTime(null);
    setDragging(null);
  }, []);

  // Hover state for chapter tooltips
  const [hoveredChapter, setHoveredChapter] = useState<VideoChapter | null>(null);

  if (duration <= 0) {
    return (
      <div className={cn("h-12 bg-muted rounded flex items-center justify-center text-muted-foreground text-sm", className)}>
        No duration
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative h-16 select-none",
        !readOnly && "cursor-pointer",
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {/* Background track */}
      <div className="absolute inset-x-0 top-4 h-8 bg-neutral-200 dark:bg-neutral-800 rounded-md overflow-hidden">
        {/* Selection range overlay */}
        {selectionRange && (
          <div
            className="absolute top-0 h-full bg-primary/30"
            style={{
              left: `${timeToPercent(selectionRange.start)}%`,
              width: `${timeToPercent(selectionRange.end - selectionRange.start)}%`,
            }}
          />
        )}

        {/* Current time indicator */}
        <div
          className="absolute top-0 w-0.5 h-full bg-red-500 z-10"
          style={{ left: `${timeToPercent(currentTime)}%` }}
        />

        {/* Hover indicator */}
        {hoverTime !== null && !readOnly && (
          <div
            className="absolute top-0 w-0.5 h-full bg-white/50"
            style={{ left: `${timeToPercent(hoverTime)}%` }}
          />
        )}

        {/* Chapter markers */}
        {sortedChapters.map((chapter) => (
          <button
            key={chapter.id}
            type="button"
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary hover:bg-primary/80 border-2 border-background z-20 transition-transform hover:scale-125"
            style={{ left: `${timeToPercent(chapter.timestamp)}%` }}
            onClick={(e) => {
              e.stopPropagation();
              onChapterClick?.(chapter);
            }}
            onMouseEnter={() => setHoveredChapter(chapter)}
            onMouseLeave={() => setHoveredChapter(null)}
            title={`${chapter.title} (${formatTime(chapter.timestamp)})`}
          />
        ))}
      </div>

      {/* Chapter tooltip */}
      {hoveredChapter && (
        <div
          className="absolute -top-12 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow-md z-50 pointer-events-none whitespace-nowrap"
          style={{ left: `${timeToPercent(hoveredChapter.timestamp)}%` }}
        >
          <p className="font-medium">{hoveredChapter.title}</p>
          <p className="text-muted-foreground">{formatTime(hoveredChapter.timestamp)}</p>
        </div>
      )}

      {/* Selection handles */}
      {selectionRange && !readOnly && (
        <>
          {/* Start handle */}
          <div
            className={cn(
              "absolute top-3 w-3 h-10 bg-primary rounded cursor-ew-resize z-30 hover:bg-primary/80",
              dragging === "start" && "ring-2 ring-primary ring-offset-2"
            )}
            style={{ left: `calc(${timeToPercent(selectionRange.start)}% - 6px)` }}
            onMouseDown={handleDragStart("start")}
          />
          {/* End handle */}
          <div
            className={cn(
              "absolute top-3 w-3 h-10 bg-primary rounded cursor-ew-resize z-30 hover:bg-primary/80",
              dragging === "end" && "ring-2 ring-primary ring-offset-2"
            )}
            style={{ left: `calc(${timeToPercent(selectionRange.end)}% - 6px)` }}
            onMouseDown={handleDragStart("end")}
          />
        </>
      )}

      {/* Time markers */}
      <div className="absolute inset-x-0 bottom-0 h-4 text-[10px] text-muted-foreground">
        {markers.map((marker) => (
          <span
            key={marker.time}
            className="absolute transform -translate-x-1/2"
            style={{ left: `${timeToPercent(marker.time)}%` }}
          >
            {marker.label}
          </span>
        ))}
      </div>

      {/* Hover time display */}
      {hoverTime !== null && !hoveredChapter && (
        <div
          className="absolute -top-6 transform -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-0.5 rounded shadow-md z-40"
          style={{ left: `${timeToPercent(hoverTime)}%` }}
        >
          {formatTime(hoverTime)}
        </div>
      )}
    </div>
  );
}

export { formatTime };

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
  isClipMode?: boolean; // Enable draggable handles for clip editing
  onSelectionDragEnd?: (range: { start: number; end: number }) => void; // Called when drag ends
  readOnly?: boolean; // Disable interactions
  inPointMarker?: number | null; // Yellow vertical bar for in-point
  outPointMarker?: number | null; // Red vertical bar for out-point
  highlightedChapterTime?: number; // Timestamp of chapter to highlight (from list hover)
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
  isClipMode = false,
  onSelectionDragEnd,
  readOnly = false,
  inPointMarker,
  outPointMarker,
  highlightedChapterTime,
  className,
}: VideoTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [dragging, setDragging] = useState<"start" | "end" | null>(null);
  // Track the range during drag for clip mode
  const [dragRange, setDragRange] = useState<{ start: number; end: number } | null>(null);

  // Determine if handles should be shown and draggable
  const showDraggableHandles = isClipMode && selectionRange && !readOnly;

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

      if (dragging && selectionRange) {
        // Calculate the new range based on which handle is being dragged
        const newRange =
          dragging === "start"
            ? {
                start: Math.min(time, selectionRange.end - 1),
                end: selectionRange.end,
              }
            : {
                start: selectionRange.start,
                end: Math.max(time, selectionRange.start + 1),
              };

        if (isClipMode) {
          // In clip mode, update local drag range for visual feedback
          setDragRange(newRange);
        }
        // Always call onSelectionChange for real-time updates
        onSelectionChange?.(newRange);
      }
    },
    [positionToTime, dragging, selectionRange, onSelectionChange, isClipMode]
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
      // Initialize drag range with current selection
      if (selectionRange) {
        setDragRange({ ...selectionRange });
      }
    },
    [readOnly, selectionRange]
  );

  // Handle drag end
  const handleMouseUp = useCallback(() => {
    if (dragging && isClipMode && dragRange && onSelectionDragEnd) {
      // Call the drag end callback with the final range
      onSelectionDragEnd(dragRange);
    }
    setDragging(null);
    setDragRange(null);
  }, [dragging, isClipMode, dragRange, onSelectionDragEnd]);

  // Handle mouse leave
  const handleMouseLeave = useCallback(() => {
    setHoverTime(null);
    // If dragging in clip mode, finalize the drag
    if (dragging && isClipMode && dragRange && onSelectionDragEnd) {
      onSelectionDragEnd(dragRange);
    }
    setDragging(null);
    setDragRange(null);
  }, [dragging, isClipMode, dragRange, onSelectionDragEnd]);

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

        {/* In-point marker (yellow) */}
        {inPointMarker != null && (
          <div
            className="absolute top-0 h-full z-[15] pointer-events-none"
            style={{ left: `${timeToPercent(inPointMarker)}%` }}
          >
            {/* Triangle at top */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-yellow-500" />
            {/* Vertical line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-yellow-500" />
          </div>
        )}

        {/* Out-point marker (red/orange) */}
        {outPointMarker != null && (
          <div
            className="absolute top-0 h-full z-[15] pointer-events-none"
            style={{ left: `${timeToPercent(outPointMarker)}%` }}
          >
            {/* Triangle at top */}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[8px] border-l-transparent border-r-transparent border-t-orange-500" />
            {/* Vertical line */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-full bg-orange-500" />
          </div>
        )}

        {/* Chapter markers */}
        {sortedChapters.map((chapter) => {
          const isHighlighted = highlightedChapterTime === chapter.timestamp;
          const shouldDim = highlightedChapterTime != null && !isHighlighted;

          return (
            <button
              key={chapter.id}
              type="button"
              className={cn(
                "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-primary hover:bg-primary/80 border-2 border-background z-20 transition-all hover:scale-125",
                shouldDim && "opacity-30",
                isHighlighted && "ring-2 ring-primary ring-offset-1 ring-offset-background scale-125"
              )}
              style={{ left: `${timeToPercent(chapter.timestamp)}%` }}
              onClick={(e) => {
                e.stopPropagation();
                onChapterClick?.(chapter);
              }}
              onMouseEnter={() => setHoveredChapter(chapter)}
              onMouseLeave={() => setHoveredChapter(null)}
              title={`${chapter.title} (${formatTime(chapter.timestamp)})`}
            />
          );
        })}
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

      {/* Selection handles - enhanced when in clip mode */}
      {selectionRange && !readOnly && (
        <>
          {/* Start handle */}
          <div
            className={cn(
              "absolute top-3 h-10 bg-primary rounded z-30 transition-all",
              showDraggableHandles
                ? "w-2 cursor-ew-resize hover:bg-primary/80 hover:w-3"
                : "w-3 cursor-ew-resize hover:bg-primary/80",
              dragging === "start" && "ring-2 ring-primary ring-offset-2 w-3"
            )}
            style={{ left: `calc(${timeToPercent(selectionRange.start)}% - ${showDraggableHandles ? 4 : 6}px)` }}
            onMouseDown={handleDragStart("start")}
          >
            {/* Grab lines indicator for clip mode */}
            {showDraggableHandles && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 items-center">
                <div className="w-0.5 h-1 bg-primary-foreground/60 rounded-full" />
                <div className="w-0.5 h-1 bg-primary-foreground/60 rounded-full" />
                <div className="w-0.5 h-1 bg-primary-foreground/60 rounded-full" />
              </div>
            )}
          </div>
          {/* End handle */}
          <div
            className={cn(
              "absolute top-3 h-10 bg-primary rounded z-30 transition-all",
              showDraggableHandles
                ? "w-2 cursor-ew-resize hover:bg-primary/80 hover:w-3"
                : "w-3 cursor-ew-resize hover:bg-primary/80",
              dragging === "end" && "ring-2 ring-primary ring-offset-2 w-3"
            )}
            style={{ left: `calc(${timeToPercent(selectionRange.end)}% - ${showDraggableHandles ? 4 : 6}px)` }}
            onMouseDown={handleDragStart("end")}
          >
            {/* Grab lines indicator for clip mode */}
            {showDraggableHandles && (
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 items-center">
                <div className="w-0.5 h-1 bg-primary-foreground/60 rounded-full" />
                <div className="w-0.5 h-1 bg-primary-foreground/60 rounded-full" />
                <div className="w-0.5 h-1 bg-primary-foreground/60 rounded-full" />
              </div>
            )}
          </div>
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

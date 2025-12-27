"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { PosterCard } from "./PosterCard";

interface Poster {
  id: string;
  title: string;
  fileUrl: string;
  type: "image" | "video" | "youtube";
  tags: string[];
  isEnabled?: boolean;
  createdAt?: string;
}

interface VirtualizedPosterGridProps {
  posters: Poster[];
  variant?: "enabled" | "disabled";
  onEdit?: (poster: Poster) => void;
  onToggleEnabled?: (poster: Poster) => void;
  onDelete?: (poster: Poster) => void;
  selectedIds?: Set<string>;
  onToggleSelection?: (id: string) => void;
  isBulkDeleting?: boolean;
  estimatedItemHeight?: number;
  className?: string;
}

/**
 * Virtualized grid for displaying hundreds of posters efficiently
 * Uses @tanstack/react-virtual with lazy loading for media
 */
export function VirtualizedPosterGrid({
  posters,
  variant = "enabled",
  onEdit,
  onToggleEnabled,
  onDelete,
  selectedIds,
  onToggleSelection,
  isBulkDeleting,
  estimatedItemHeight = 280,
  className = "",
}: VirtualizedPosterGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window === "undefined") return 3;
    const width = window.innerWidth;
    if (width < 768) return 2; // mobile
    if (width < 1024) return 3; // tablet
    if (width < 1280) return 4; // desktop
    return 5; // large desktop
  });

  // Group posters into rows - memoized for performance
  const rows = useMemo(() => {
    const result: Poster[][] = [];
    for (let i = 0; i < posters.length; i += columnCount) {
      result.push(posters.slice(i, i + columnCount));
    }
    return result;
  }, [posters, columnCount]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan: 2, // Fewer overscan for media-heavy content
    // Enable dynamic sizing for better accuracy
    measureElement:
      typeof window !== "undefined" && navigator.userAgent.indexOf("Firefox") === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
  });

  // Recalculate columns on window resize with debouncing
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const width = window.innerWidth;
        let newColumnCount = 3;
        if (width < 768) newColumnCount = 2;
        else if (width < 1024) newColumnCount = 3;
        else if (width < 1280) newColumnCount = 4;
        else newColumnCount = 5;
        
        if (newColumnCount !== columnCount) {
          setColumnCount(newColumnCount);
          rowVirtualizer.measure();
        }
      }, 150); // Debounce resize events
    };
    
    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [columnCount, rowVirtualizer]);

  if (posters.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">
          {variant === "enabled" ? "No active posters" : "No disabled posters"}
        </p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height: "600px", maxHeight: "calc(100vh - 300px)" }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowPosters = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div
                className="grid gap-3 px-1 py-2"
                style={{
                  gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                }}
              >
                {rowPosters.map((poster) => (
                  <PosterCard
                    key={poster.id}
                    poster={poster}
                    variant={variant}
                    onEdit={onEdit}
                    onToggleEnabled={onToggleEnabled}
                    onDelete={onDelete}
                    isSelected={selectedIds?.has(poster.id)}
                    onToggleSelection={onToggleSelection}
                    isBulkDeleting={isBulkDeleting}
                    showSelectionCheckbox={selectedIds !== undefined}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}





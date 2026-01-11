"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { GuestCard } from "./GuestCard";
import type { Guest } from "@/lib/queries";

interface VirtualizedGuestGridProps {
  guests: Guest[];
  variant?: "enabled" | "disabled";
  onQuickLowerThird?: (guest: Guest) => void;
  onEdit?: (guest: Guest) => void;
  onToggleEnabled?: (guest: Guest) => void;
  onDelete?: (guest: Guest) => void;
  estimatedItemHeight?: number;
  className?: string;
}

/**
 * Virtualized grid for displaying hundreds of guests efficiently
 * Uses @tanstack/react-virtual for performance
 */
export function VirtualizedGuestGrid({
  guests,
  variant = "enabled",
  onQuickLowerThird,
  onEdit,
  onToggleEnabled,
  onDelete,
  estimatedItemHeight = 200,
  className = "",
}: VirtualizedGuestGridProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window === "undefined") return 3;
    const width = window.innerWidth;
    if (width < 640) return 2;
    if (width < 1024) return 3;
    if (width < 1280) return 4;
    return 5;
  });

  // Group guests into rows - memoized for performance
  const rows = useMemo(() => {
    const result: Guest[][] = [];
    for (let i = 0; i < guests.length; i += columnCount) {
      result.push(guests.slice(i, i + columnCount));
    }
    return result;
  }, [guests, columnCount]);

  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan: 3, // Increased overscan for smoother scrolling
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
        if (width < 640) newColumnCount = 2;
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

  if (guests.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">
          {variant === "enabled" ? "No active guests" : "No disabled guests"}
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
          const rowGuests = rows[virtualRow.index];
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
                {rowGuests.map((guest) => (
                  <GuestCard
                    key={guest.id}
                    guest={guest}
                    variant={variant}
                    onQuickLowerThird={onQuickLowerThird}
                    onEdit={onEdit}
                    onToggleEnabled={onToggleEnabled}
                    onDelete={onDelete}
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


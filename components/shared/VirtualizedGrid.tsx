"use client";

import { useRef, useEffect, useState, useMemo, ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

/**
 * Breakpoint configuration for responsive column counts.
 * Keys are min-widths in pixels, values are column counts.
 */
export interface ColumnBreakpoints {
  /** Default column count (used when no breakpoint matches) */
  default?: number;
  /** Columns at 640px+ (sm) */
  sm?: number;
  /** Columns at 768px+ (md) */
  md?: number;
  /** Columns at 1024px+ (lg) */
  lg?: number;
  /** Columns at 1280px+ (xl) */
  xl?: number;
}

/**
 * Default breakpoint configuration for asset grids
 */
export const DEFAULT_COLUMN_BREAKPOINTS: Required<ColumnBreakpoints> = {
  default: 2,
  sm: 2,
  md: 3,
  lg: 4,
  xl: 5,
};

/**
 * Props for the VirtualizedGrid component
 */
export interface VirtualizedGridProps<T> {
  /** Items to display in the grid */
  items: T[];
  /** Function to render each item */
  renderItem: (item: T) => ReactNode;
  /** Function to extract unique key from each item */
  keyExtractor: (item: T) => string;
  /** Optional variant for styling (passed to empty state) */
  variant?: "enabled" | "disabled";
  /** Custom empty state messages */
  emptyMessage?: {
    enabled?: string;
    disabled?: string;
  };
  /** Column breakpoint configuration */
  columnBreakpoints?: ColumnBreakpoints;
  /** Estimated height of each row in pixels */
  estimatedItemHeight?: number;
  /** Number of extra rows to render outside viewport */
  overscan?: number;
  /** Container height (default: 600px) */
  height?: string;
  /** Max height CSS value (default: calc(100vh - 300px)) */
  maxHeight?: string;
  /** Additional className for the container */
  className?: string;
  /** Debounce delay for resize events in ms */
  resizeDebounceMs?: number;
}

/**
 * Calculates column count based on window width and breakpoints
 */
function getColumnCount(
  width: number,
  breakpoints: ColumnBreakpoints
): number {
  const bp = { ...DEFAULT_COLUMN_BREAKPOINTS, ...breakpoints };

  if (width >= 1280) return bp.xl;
  if (width >= 1024) return bp.lg;
  if (width >= 768) return bp.md;
  if (width >= 640) return bp.sm;
  return bp.default;
}

/**
 * VirtualizedGrid - A generic virtualized grid component for efficient
 * rendering of large item collections.
 *
 * Uses @tanstack/react-virtual for virtualization and supports:
 * - Responsive column counts via breakpoints
 * - Dynamic row height measurement
 * - Debounced resize handling
 * - Customizable empty states
 *
 * @example
 * ```tsx
 * <VirtualizedGrid
 *   items={guests}
 *   renderItem={(guest) => (
 *     <GuestCard
 *       guest={guest}
 *       onEdit={handleEdit}
 *       onDelete={handleDelete}
 *     />
 *   )}
 *   keyExtractor={(guest) => guest.id}
 *   variant="enabled"
 *   emptyMessage={{ enabled: "No active guests", disabled: "No disabled guests" }}
 * />
 * ```
 */
export function VirtualizedGrid<T>({
  items,
  renderItem,
  keyExtractor,
  variant = "enabled",
  emptyMessage = {},
  columnBreakpoints = {},
  estimatedItemHeight = 200,
  overscan = 3,
  height = "600px",
  maxHeight = "calc(100vh - 300px)",
  className = "",
  resizeDebounceMs = 150,
}: VirtualizedGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Calculate initial column count
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window === "undefined") {
      return DEFAULT_COLUMN_BREAKPOINTS.default;
    }
    return getColumnCount(window.innerWidth, columnBreakpoints);
  });

  // Group items into rows - memoized for performance
  const rows = useMemo(() => {
    const result: T[][] = [];
    for (let i = 0; i < items.length; i += columnCount) {
      result.push(items.slice(i, i + columnCount));
    }
    return result;
  }, [items, columnCount]);

  // Set up virtualizer
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimatedItemHeight,
    overscan,
    // Enable dynamic sizing for better accuracy (except Firefox)
    measureElement:
      typeof window !== "undefined" &&
      navigator.userAgent.indexOf("Firefox") === -1
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
        const newColumnCount = getColumnCount(width, columnBreakpoints);

        if (newColumnCount !== columnCount) {
          setColumnCount(newColumnCount);
          rowVirtualizer.measure();
        }
      }, resizeDebounceMs);
    };

    window.addEventListener("resize", handleResize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", handleResize);
    };
  }, [columnCount, columnBreakpoints, resizeDebounceMs, rowVirtualizer]);

  // Empty state
  if (items.length === 0) {
    const defaultMessages = {
      enabled: "No active items",
      disabled: "No disabled items",
    };
    const message =
      emptyMessage[variant] || defaultMessages[variant];

    return (
      <div className="text-center py-12 border-2 border-dashed rounded-lg">
        <p className="text-muted-foreground">{message}</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={`overflow-auto ${className}`}
      style={{ height, maxHeight }}
    >
      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const rowItems = rows[virtualRow.index];
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
                {rowItems.map((item) => (
                  <div key={keyExtractor(item)}>{renderItem(item)}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

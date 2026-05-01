"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GripHorizontal } from "lucide-react";
import {
  useArmedVideoPoster,
  useArmedVideoPosterSync,
} from "@/hooks/useArmedVideoPoster";
import { formatTimeShort } from "@/lib/utils/durationParser";
import { PosterPreviewPlayer } from "./PosterPreviewPlayer";

const BOUNDS_STORAGE_KEY = "ols.posterPreview.bounds";
// Dev-only kill switch: set `ols.posterPreview.disabled = "1"` in localStorage to hide the overlay.
const DISABLED_STORAGE_KEY = "ols.posterPreview.disabled";
const DEFAULT_WIDTH = 480;
const MIN_WIDTH = 280;
const MAX_WIDTH = 960;
const ASPECT = 9 / 16;
const TIMELINE_HEIGHT_GUESS = 80; // keep preview above the global timeline

function isPreviewDisabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISABLED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

interface Bounds {
  top: number;
  left: number;
  width: number;
}

function readStoredBounds(): Bounds | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(BOUNDS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Bounds;
    if (
      typeof parsed.top === "number" &&
      typeof parsed.left === "number" &&
      typeof parsed.width === "number"
    ) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

function persistBounds(bounds: Bounds): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BOUNDS_STORAGE_KEY, JSON.stringify(bounds));
  } catch {
    // ignore
  }
}

function defaultBounds(): Bounds {
  if (typeof window === "undefined") {
    return { top: 0, left: 0, width: DEFAULT_WIDTH };
  }
  const width = DEFAULT_WIDTH;
  const height = width * ASPECT;
  return {
    width,
    left: Math.max(20, window.innerWidth - width - 20),
    top: Math.max(20, window.innerHeight - height - TIMELINE_HEIGHT_GUESS),
  };
}

function clampToViewport(bounds: Bounds): Bounds {
  if (typeof window === "undefined") return bounds;
  const height = bounds.width * ASPECT;
  const maxLeft = Math.max(0, window.innerWidth - bounds.width);
  const maxTop = Math.max(0, window.innerHeight - height);
  return {
    width: bounds.width,
    left: Math.min(Math.max(0, bounds.left), maxLeft),
    top: Math.min(Math.max(0, bounds.top), maxTop),
  };
}

/**
 * Floating draggable/resizable video preview for the regie operator.
 *
 * Visible while a video poster is armed (cue or live). Same component for
 * both phases — header tint and badge tell the operator which.
 *
 * Mounts the WebSocket sync that keeps the armed store in step with OBS.
 */
export function PosterPreviewOverlay() {
  const [disabled] = useState<boolean>(isPreviewDisabled);
  const [bounds, setBounds] = useState<Bounds>(() => readStoredBounds() ?? defaultBounds());
  const [collapsed, setCollapsed] = useState(false);

  useArmedVideoPosterSync();
  const { armed, reportTime, reportPlaying, reportDuration } = useArmedVideoPoster();

  useEffect(() => {
    const onResize = () => setBounds((prev) => clampToViewport(prev));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const height = bounds.width * ASPECT;

  // Persist bounds only on pointerup so drag/resize doesn't thrash localStorage at 60Hz.
  const dragStartRef = useRef<{ x: number; y: number; startLeft: number; startTop: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; startWidth: number } | null>(null);
  const latestBoundsRef = useRef<Bounds>(bounds);
  latestBoundsRef.current = bounds;

  const releasePointer = (target: HTMLElement, pointerId: number) => {
    try {
      target.releasePointerCapture(pointerId);
    } catch {
      // ignore
    }
    persistBounds(latestBoundsRef.current);
  };

  const onDragPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        startLeft: bounds.left,
        startTop: bounds.top,
      };
    },
    [bounds.left, bounds.top]
  );

  const onDragPointerMove = useCallback((e: React.PointerEvent) => {
    const start = dragStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    setBounds((prev) =>
      clampToViewport({
        ...prev,
        left: start.startLeft + dx,
        top: start.startTop + dy,
      })
    );
  }, []);

  const onDragPointerUp = useCallback((e: React.PointerEvent) => {
    dragStartRef.current = null;
    releasePointer(e.currentTarget as HTMLElement, e.pointerId);
  }, []);

  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      resizeStartRef.current = { x: e.clientX, startWidth: bounds.width };
    },
    [bounds.width]
  );

  const onResizePointerMove = useCallback((e: React.PointerEvent) => {
    const start = resizeStartRef.current;
    if (!start) return;
    const dx = e.clientX - start.x;
    setBounds((prev) => {
      const nextWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, start.startWidth + dx));
      return clampToViewport({ ...prev, width: nextWidth });
    });
  }, []);

  const onResizePointerUp = useCallback((e: React.PointerEvent) => {
    resizeStartRef.current = null;
    releasePointer(e.currentTarget as HTMLElement, e.pointerId);
  }, []);

  if (disabled || !armed) return null;

  const isLive = armed.isLive;
  const title = isLive ? "Live preview" : "Cue (local)";

  return (
    <div
      role="complementary"
      aria-label="Regie video preview"
      style={{
        position: "fixed",
        top: bounds.top,
        left: bounds.left,
        width: bounds.width,
        zIndex: 2000,
        background: "#0a0a0a",
        color: "#eee",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: 8,
        boxShadow: "0 12px 40px rgba(0,0,0,0.45)",
        overflow: "hidden",
        userSelect: "none",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Header (drag handle) */}
      <div
        onPointerDown={onDragPointerDown}
        onPointerMove={onDragPointerMove}
        onPointerUp={onDragPointerUp}
        onPointerCancel={onDragPointerUp}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "6px 8px",
          background: isLive ? "#3a1f1f" : "#1f3a5f",
          cursor: "grab",
          fontSize: 12,
          fontWeight: 500,
        }}
      >
        <GripHorizontal size={14} aria-hidden />
        <span>{title}</span>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          aria-label={collapsed ? "Expand preview" : "Collapse preview"}
          onClick={() => setCollapsed((c) => !c)}
          style={iconBtnStyle}
          onPointerDown={(e) => e.stopPropagation()}
        >
          {collapsed ? "+" : "–"}
        </button>
      </div>

      {!collapsed && (
        <>
          {/* Player area */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height,
              background: "#000",
            }}
          >
            <PosterPreviewPlayer
              armed={armed}
              onTimeUpdate={reportTime}
              onPlayingChange={reportPlaying}
              onDuration={reportDuration}
            />
          </div>

          {/* Bottom bar: time + resize handle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 8px",
              background: "#111",
              fontSize: 11,
            }}
          >
            <span style={{ color: "#aaa" }}>
              {formatTimeShort(armed.currentTime)}
              {armed.duration > 0 ? ` / ${formatTimeShort(armed.duration)}` : ""}
            </span>
            <span style={{ flex: 1 }} />
            {/* Resize handle (bottom-right corner) */}
            <div
              role="separator"
              aria-label="Resize preview"
              onPointerDown={onResizePointerDown}
              onPointerMove={onResizePointerMove}
              onPointerUp={onResizePointerUp}
              onPointerCancel={onResizePointerUp}
              style={{
                width: 14,
                height: 14,
                cursor: "nwse-resize",
                background:
                  "linear-gradient(135deg, transparent 50%, rgba(255,255,255,0.4) 50%)",
                borderRadius: 2,
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "inherit",
  border: "none",
  padding: "2px 6px",
  cursor: "pointer",
  borderRadius: 3,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
};

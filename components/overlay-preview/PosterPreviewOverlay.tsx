"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, X, GripHorizontal } from "lucide-react";
import { apiGet } from "@/lib/utils/ClientFetch";
import { usePosterPreviewState } from "@/hooks/usePosterPreviewState";
import { formatTimeShort } from "@/lib/utils/durationParser";
import { PosterPreviewPlayer } from "./PosterPreviewPlayer";

const BOUNDS_STORAGE_KEY = "ols.posterPreview.bounds";
const DEFAULT_WIDTH = 480;
const MIN_WIDTH = 280;
const MAX_WIDTH = 960;
const ASPECT = 9 / 16;
const TIMELINE_HEIGHT_GUESS = 80; // keep preview above the global timeline

interface Bounds {
  top: number;
  left: number;
  width: number;
}

interface PosterListItem {
  id: string;
  fileUrl: string;
  type: string;
  startTime?: number | null;
  endTime?: number | null;
  endBehavior?: "stop" | "loop" | null;
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
 * Only the operator who launched (or took over) the poster sees this.
 * Renders on top of the Dockview layout via position: fixed.
 */
export function PosterPreviewOverlay() {
  const [posters, setPosters] = useState<PosterListItem[]>([]);
  const [bounds, setBounds] = useState<Bounds>(() => readStoredBounds() ?? defaultBounds());
  const [collapsed, setCollapsed] = useState(false);

  // Fetch posters once so the cue mode can resolve { posterId } → full poster.
  useEffect(() => {
    let alive = true;
    apiGet<{ posters: PosterListItem[] }>("/api/assets/posters?enabled=true")
      .then((data) => {
        if (alive) setPosters(data.posters || []);
      })
      .catch(() => {
        // Preview without posters list means cue won't resolve — that's acceptable.
      });
    return () => {
      alive = false;
    };
  }, []);

  const preview = usePosterPreviewState({ posters });

  // Keep bounds within the viewport as the window resizes.
  useEffect(() => {
    const onResize = () => setBounds((prev) => clampToViewport(prev));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Persist bounds whenever they change.
  useEffect(() => {
    persistBounds(bounds);
  }, [bounds]);

  const height = bounds.width * ASPECT;

  // --- Drag + resize ---

  const dragStartRef = useRef<{ x: number; y: number; startLeft: number; startTop: number } | null>(null);
  const resizeStartRef = useRef<{ x: number; startWidth: number } | null>(null);

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

  const onDragPointerMove = useCallback(
    (e: React.PointerEvent) => {
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
    },
    []
  );

  const onDragPointerUp = useCallback((e: React.PointerEvent) => {
    dragStartRef.current = null;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
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
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  }, []);

  if (!preview) return null;

  const isCue = preview.mode === "cue";
  const title = isCue ? "Cue (local)" : "Live preview";
  const currentTime =
    preview.mode === "cue" ? preview.cue.currentTime : preview.playback.currentTime;
  const duration =
    preview.mode === "cue"
      ? Math.max(preview.poster.endTime ?? 0, currentTime)
      : preview.playback.duration;
  const isPlaying = preview.mode === "cue" ? preview.cue.isPlaying : preview.playback.isPlaying;

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
          background: isCue ? "#1f3a5f" : "#3a1f1f",
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
        {isCue && (
          <button
            type="button"
            aria-label="Clear cue"
            onClick={preview.clearCue}
            onPointerDown={(e) => e.stopPropagation()}
            style={iconBtnStyle}
          >
            <X size={14} />
          </button>
        )}
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
            <PosterPreviewPlayer state={preview} />
          </div>

          {/* Bottom bar: play/pause + time */}
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
            {isCue && (
              <button
                type="button"
                aria-label={isPlaying ? "Pause cue" : "Play cue"}
                onClick={() => preview.updateCuePlaying(!isPlaying)}
                style={iconBtnStyle}
              >
                {isPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
            )}
            <span style={{ color: "#aaa" }}>
              {formatTimeShort(currentTime)}
              {duration > 0 ? ` / ${formatTimeShort(duration)}` : ""}
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

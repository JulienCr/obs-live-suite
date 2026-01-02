"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Eye, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { PosterQuickAdd } from "@/components/assets/PosterQuickAdd";
import { getWebSocketUrl } from "@/lib/utils/websocket";

interface Poster {
  id: string;
  title: string;
  fileUrl: string;
  type: string;
  source?: string;
  isEnabled: boolean;
}

interface PosterCardProps {
  size?: string;
  className?: string;
  settings?: Record<string, unknown>;
}

/**
 * PosterContent - The inner content for poster management (without Card wrapper)
 * Used by PosterPanel in Dockview and PosterCard for standalone use.
 */
type DisplayMode = "left" | "right" | "bigpicture";

// Aspect ratio classification for masonry layout
type AspectRatioClass = '16:9' | '1:1' | '1:1.414';

const ASPECT_RATIOS: Record<AspectRatioClass, { paddingBottom: string; heightRatio: number }> = {
  '16:9': { paddingBottom: '56.25%', heightRatio: 0.5625 },
  '1:1': { paddingBottom: '100%', heightRatio: 1.0 },
  '1:1.414': { paddingBottom: '141.4%', heightRatio: 1.414 },
};

// Grid masonry settings
const GRID_ROW_UNIT = 4;
const GRID_GAP = 4;

const classifyAspectRatio = (width: number, height: number): AspectRatioClass => {
  const ratio = width / height;
  if (ratio >= 1.5) return '16:9';
  if (ratio >= 0.85) return '1:1';
  return '1:1.414';
};

interface PosterContentProps {
  className?: string;
}

export function PosterContent({ className }: PosterContentProps) {
  const t = useTranslations("dashboard.poster");
  const tCommon = useTranslations("common");
  const [activePoster, setActivePoster] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode | null>(null);
  const [activeSide, setActiveSide] = useState<"left" | "right" | null>(null); // kept for backwards compatibility
  const [activeType, setActiveType] = useState<string | null>(null);
  const [showControls, setShowControls] = useState(false);
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultDisplayMode, setDefaultDisplayMode] = useState<DisplayMode>("left");
  const [playbackState, setPlaybackState] = useState({
    isPlaying: false,
    isMuted: true,
    currentTime: 0,
    duration: 0,
  });
  const [localSeekTime, setLocalSeekTime] = useState<number | null>(null);
  const [aspectRatios, setAspectRatios] = useState<Record<string, AspectRatioClass>>({});
  const [columnCount, setColumnCount] = useState(2);
  const [containerWidth, setContainerWidth] = useState(400);
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Column width constraints
  const MIN_COLUMN_WIDTH = 170;
  const MAX_COLUMN_WIDTH = 240;

  const calculateColumnCount = useCallback((width: number) => {
    if (width <= 0) return 1;
    // Calculate optimal column count to keep columns between min and max width
    const minCols = Math.ceil(width / MAX_COLUMN_WIDTH);
    const maxCols = Math.floor(width / MIN_COLUMN_WIDTH);
    // Use the larger of minCols (to not exceed max width) clamped by maxCols (to not go below min width)
    return Math.max(1, Math.min(minCols, maxCols) || minCols);
  }, []);

  // Calculate row span for an item based on its aspect ratio
  // Formula: actualHeight = N * GRID_ROW_UNIT + (N-1) * GRID_GAP = N * (ROW + GAP) - GAP
  // So: N = (targetHeight + GAP) / (ROW + GAP)
  const calculateRowSpan = useCallback((ratioClass: AspectRatioClass) => {
    const columnWidth = (containerWidth - (columnCount - 1) * GRID_GAP) / columnCount;
    const itemHeight = columnWidth * ASPECT_RATIOS[ratioClass].heightRatio;
    return Math.ceil((itemHeight + GRID_GAP) / (GRID_ROW_UNIT + GRID_GAP));
  }, [containerWidth, columnCount]);

  // ResizeObserver for responsive column count
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setContainerWidth(width);
        setColumnCount(calculateColumnCount(width));
      }
    });

    observer.observe(container);
    // Initial calculation
    const initialWidth = container.offsetWidth;
    setContainerWidth(initialWidth);
    setColumnCount(calculateColumnCount(initialWidth));

    return () => observer.disconnect();
  }, [calculateColumnCount]);

  const handleImageLoad = (posterId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setAspectRatios(prev => ({ ...prev, [posterId]: classifyAspectRatio(img.naturalWidth, img.naturalHeight) }));
  };

  const handleVideoLoad = (posterId: string, e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setAspectRatios(prev => ({ ...prev, [posterId]: classifyAspectRatio(video.videoWidth, video.videoHeight) }));
  };

  useEffect(() => {
    fetchPosters();
    fetchDefaultDisplayMode();
  }, []);

  // WebSocket connection for playback state
  useEffect(() => {
    if (!activePoster) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const ws = new WebSocket(getWebSocketUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      // Subscribe to the appropriate channel based on display mode
      const channel = displayMode === "bigpicture" ? "poster-bigpicture" : "poster";
      ws.send(JSON.stringify({
        type: "subscribe",
        channel,
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        // Only process messages from the active channel
        const expectedChannel = displayMode === "bigpicture" ? "poster-bigpicture" : "poster";
        if (message.channel === expectedChannel && message.data) {
          const data = message.data;

          // Merge with existing state, only updating valid values
          setPlaybackState(prev => {
            const newState = { ...prev };

            // Only update currentTime if valid and not seeking
            if (!isNaN(data.currentTime) && isFinite(data.currentTime) && localSeekTime === null) {
              newState.currentTime = data.currentTime;
            }

            // Only update duration if valid
            if (!isNaN(data.duration) && isFinite(data.duration) && data.duration > 0) {
              newState.duration = data.duration;
            }

            // Update playing state (boolean, always safe)
            if (typeof data.isPlaying === 'boolean') {
              newState.isPlaying = data.isPlaying;
            }

            // Update muted state (boolean, always safe)
            if (typeof data.isMuted === 'boolean') {
              newState.isMuted = data.isMuted;
            }

            return newState;
          });
        }
      } catch (error) {
        console.error("[PosterCard] Failed to parse message:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("[PosterCard] WebSocket error:", error);
    };

    return () => {
      ws.close();
    };
  }, [activePoster, displayMode]);

  const fetchPosters = async () => {
    try {
      const res = await fetch("/api/assets/posters");
      const data = await res.json();
      // Filter to show only enabled posters
      const enabledPosters = (data.posters || []).filter((p: Poster) => p.isEnabled);
      setPosters(enabledPosters);
    } catch (error) {
      console.error("Failed to fetch posters:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultDisplayMode = async () => {
    try {
      const res = await fetch("/api/settings/general");
      const data = await res.json();
      const mode = data.settings?.defaultPosterDisplayMode || "left";
      setDefaultDisplayMode(mode as DisplayMode);
    } catch (error) {
      console.error("Failed to fetch default display mode:", error);
      // Keep default "left" if fetch fails
    }
  };

  const handleTogglePoster = async (poster: Poster, mode: DisplayMode) => {
    // Toggle off if same poster + same mode
    if (activePoster === poster.id && displayMode === mode) {
      await hideCurrentMode();
      return;
    }

    // Hide current mode before showing new one
    if (activePoster) {
      await hideCurrentMode();
      // Small delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Show in new mode
    await showInMode(poster, mode);
  };

  const handleCardClick = async (poster: Poster) => {
    // If this poster is currently displayed, toggle it off
    if (activePoster === poster.id) {
      await hideCurrentMode();
      return;
    }

    // Otherwise, show it in the default position
    // First hide any currently displayed poster
    if (activePoster) {
      await hideCurrentMode();
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Show in default mode
    await showInMode(poster, defaultDisplayMode);
  };

  const hideCurrentMode = async () => {
    try {
      const endpoint = displayMode === "bigpicture"
        ? "/api/overlays/poster-bigpicture"
        : "/api/overlays/poster";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "hide" }),
      });

      if (!response.ok) {
        throw new Error("Failed to hide poster");
      }

      setActivePoster(null);
      setDisplayMode(null);
      setActiveSide(null);
      setActiveType(null);
      setShowControls(false);
    } catch (error) {
      console.error("Error hiding poster:", error);
    }
  };

  const showInMode = async (poster: Poster, mode: DisplayMode) => {
    try {
      const endpoint = mode === "bigpicture"
        ? "/api/overlays/poster-bigpicture"
        : "/api/overlays/poster";

      const payload: any = {
        posterId: poster.id,
        fileUrl: poster.fileUrl,
        type: poster.type,
        source: poster.source,
        transition: "fade",
      };

      // Add side only if not bigpicture
      if (mode !== "bigpicture") {
        payload.side = mode;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "show",
          payload,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("[PosterCard] Failed to show poster:", errorData);
        throw new Error(`Failed to show poster: ${errorData.error || response.statusText}`);
      }

      setActivePoster(poster.id);
      setDisplayMode(mode);
      setActiveSide(mode === "bigpicture" ? null : mode);
      setActiveType(poster.type);

      // Show controls if video or youtube
      if (poster.type === "video" || poster.type === "youtube") {
        setShowControls(true);
      }
    } catch (error) {
      console.error("Error showing poster:", error);
    }
  };

  const handlePlayPause = async () => {
    try {
      const endpoint = displayMode === "bigpicture"
        ? "/api/overlays/poster-bigpicture"
        : "/api/overlays/poster";
      const action = playbackState.isPlaying ? "pause" : "play";

      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      // Optimistic update
      setPlaybackState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    } catch (error) {
      console.error("Control error:", error);
    }
  };

  const handleSeek = async (time: number) => {
    try {
      const endpoint = displayMode === "bigpicture"
        ? "/api/overlays/poster-bigpicture"
        : "/api/overlays/poster";

      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "seek",
          payload: { time }
        }),
      });

      // Optimistic update
      setPlaybackState(prev => ({ ...prev, currentTime: time }));
    } catch (error) {
      console.error("Seek error:", error);
    }
  };

  const handleMute = async () => {
    try {
      const endpoint = displayMode === "bigpicture"
        ? "/api/overlays/poster-bigpicture"
        : "/api/overlays/poster";
      const action = playbackState.isMuted ? "unmute" : "mute";

      await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      // Optimistic update
      setPlaybackState(prev => ({ ...prev, isMuted: !prev.isMuted }));
    } catch (error) {
      console.error("Mute error:", error);
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) {
      return "0:00";
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <div className={cn("space-y-3", className)}>
        {/* Quick Add Component */}
        <PosterQuickAdd
            onPosterAdded={fetchPosters}
            onPosterDisplayed={(poster, mode) => {
              showInMode(poster, mode);
            }}
          />

          <div ref={containerRef} className="h-full w-full">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{tCommon("loading")}</div>
          ) : posters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("noPoster")}
            </div>
          ) : (
            <ScrollArea className="h-full w-full">
              <div
                className="pr-4"
                style={{
                  display: 'grid',
                  gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                  gridAutoRows: `${GRID_ROW_UNIT}px`,
                  gap: `${GRID_GAP}px`,
                }}
              >
                {posters.map((poster) => {
                  const ratioClass = aspectRatios[poster.id] || '16:9';
                  const { paddingBottom } = ASPECT_RATIOS[ratioClass];
                  const rowSpan = calculateRowSpan(ratioClass);

                  return (
                    <div
                      key={poster.id}
                      className={cn(
                        "group relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                        activePoster === poster.id
                          ? "border-green-500 ring-2 ring-green-500 ring-offset-2"
                          : "border-border hover:border-primary"
                      )}
                      style={{ gridRowEnd: `span ${rowSpan}` }}
                      title={poster.title}
                      onClick={() => handleCardClick(poster)}
                    >
                      {/* Aspect ratio container */}
                      <div className="relative w-full h-full">
                        {/* Preview */}
                        {poster.type === "youtube" ? (
                          <>
                            <img
                              src={`https://img.youtube.com/vi/${poster.fileUrl.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([^?&]+)/)?.[1]}/mqdefault.jpg`}
                              alt={poster.title}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                              <Eye className="w-6 h-6 text-white" />
                            </div>
                          </>
                        ) : poster.type === "video" ? (
                          <video
                            src={poster.fileUrl}
                            className="absolute inset-0 w-full h-full object-cover"
                            muted
                            onLoadedMetadata={(e) => handleVideoLoad(poster.id, e)}
                          />
                        ) : (
                          <img
                            src={poster.fileUrl}
                            alt={poster.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            onLoad={(e) => handleImageLoad(poster.id, e)}
                          />
                        )}

                        {/* Hover overlay with title */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 pointer-events-none">
                          <span className="text-white text-xs font-medium text-center line-clamp-2">
                            {poster.title}
                          </span>
                        </div>
                      </div>

                      {/* Three button controls on hover */}
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 z-10">
                        <Button
                          size="sm"
                          variant={displayMode === "left" && activePoster === poster.id ? "default" : "secondary"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePoster(poster, "left");
                          }}
                          className={cn(
                            "px-2 py-1 h-auto",
                            displayMode === "left" && activePoster === poster.id && "bg-green-500 hover:bg-green-600"
                          )}
                          aria-label={t("ariaShowLeft", { title: poster.title })}
                        >
                          ← {t("positions.left")}
                        </Button>
                        <Button
                          size="sm"
                          variant={displayMode === "right" && activePoster === poster.id ? "default" : "secondary"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePoster(poster, "right");
                          }}
                          className={cn(
                            "px-2 py-1 h-auto",
                            displayMode === "right" && activePoster === poster.id && "bg-green-500 hover:bg-green-600"
                          )}
                          aria-label={t("ariaShowRight", { title: poster.title })}
                        >
                          {t("positions.right")} →
                        </Button>
                        <Button
                          size="sm"
                          variant={displayMode === "bigpicture" && activePoster === poster.id ? "default" : "secondary"}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTogglePoster(poster, "bigpicture");
                          }}
                          className={cn(
                            "px-2 py-1 h-auto",
                            displayMode === "bigpicture" && activePoster === poster.id && "bg-green-500 hover:bg-green-600"
                          )}
                          aria-label={t("ariaShowBig", { title: poster.title })}
                        >
                          {t("positions.big")}
                        </Button>
                      </div>

                      {/* Active indicator badge */}
                      {activePoster === poster.id && (
                        <div className="absolute top-1 right-1 flex items-center gap-1 bg-green-500 rounded-full px-2 py-1 pointer-events-none">
                          <Eye className="w-3 h-3 text-white" />
                          <span className="text-white text-[10px] font-semibold">
                            {displayMode === "left" ? "L" : displayMode === "right" ? "R" : ""}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
          </div>
      </div>

      {/* Video/YouTube Controls - Fixed at bottom */}
      {showControls && (
        <div className="fixed bottom-4 left-4 right-4 p-4 border rounded-lg bg-background shadow-lg z-50">
          <div className="flex items-center gap-2 mb-2">
            <Button size="sm" onClick={handlePlayPause} variant="outline">
              {playbackState.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button size="sm" onClick={handleMute} variant="outline">
              {playbackState.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <span className="text-sm ml-auto">
              {formatTime(playbackState.currentTime)} / {formatTime(playbackState.duration)}
            </span>
          </div>
          <Slider
            value={[localSeekTime !== null ? localSeekTime : (isNaN(playbackState.currentTime) ? 0 : playbackState.currentTime)]}
            max={isNaN(playbackState.duration) || playbackState.duration <= 0 ? 100 : playbackState.duration}
            step={0.1}
            onValueChange={([time]) => {
              setLocalSeekTime(time);
              // Clear any existing timeout
              if (seekTimeoutRef.current) {
                clearTimeout(seekTimeoutRef.current);
              }
            }}
            onValueCommit={([time]) => {
              handleSeek(time);
              // Clear localSeekTime after 1.5 seconds to allow overlay to update
              seekTimeoutRef.current = setTimeout(() => {
                setLocalSeekTime(null);
              }, 1500);
            }}
            className="w-full"
          />
        </div>
      )}
    </>
  );
}

/**
 * PosterCard - Thumbnail gallery for quick poster triggering (with Card wrapper)
 * For standalone use outside of Dockview panels.
 */
export function PosterCard({ size, className, settings }: PosterCardProps = {}) {
  const t = useTranslations("dashboard.poster");

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <PosterContent />
      </CardContent>
    </Card>
  );
}


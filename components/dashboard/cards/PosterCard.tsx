"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { VideoTimeline } from "@/components/assets/VideoTimeline";
import {
  Eye,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  ChevronDown,
  Film,
  Hand,
  Send,
  EyeOff,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isVideoPosterType, type VideoChapter } from "@/lib/models/Poster";
import { PosterEventType } from "@/lib/models/OverlayEvents";
import { cn } from "@/lib/utils/cn";
import { formatTimeShort } from "@/lib/utils/durationParser";
import { getEffectivePosterDuration } from "@/components/dashboard/cards/posterDurationHelpers";
import { PosterQuickAdd } from "@/components/assets/PosterQuickAdd";
import { apiGet, apiPost } from "@/lib/utils/ClientFetch";
import { useSyncWithOverlayState } from "@/hooks/useSyncWithOverlayState";
import { useArmedVideoPoster, type DisplayMode } from "@/hooks/useArmedVideoPoster";
import { CLIENT_ID } from "@/lib/utils/clientId";
import { toast } from "sonner";

interface Poster {
  id: string;
  title: string;
  fileUrl: string;
  type: string;
  source?: string;
  isEnabled?: boolean;
  thumbnailUrl?: string | null;
  duration?: number | null;
  startTime?: number | null;
  endTime?: number | null;
  endBehavior?: "stop" | "loop" | null;
  metadata?: {
    chapters?: VideoChapter[];
    [key: string]: unknown;
  };
}

interface PosterCardProps {
  size?: string;
  className?: string;
  settings?: Record<string, unknown>;
}

const posterEndpoint = (mode: DisplayMode | null | undefined) =>
  mode === "bigpicture" ? "/api/overlays/poster-bigpicture" : "/api/overlays/poster";

// Aspect ratio classification for masonry layout
type AspectRatioClass = "16:9" | "1:1" | "1:1.414";

const ASPECT_RATIOS: Record<AspectRatioClass, { paddingBottom: string; heightRatio: number }> = {
  "16:9": { paddingBottom: "56.25%", heightRatio: 0.5625 },
  "1:1": { paddingBottom: "100%", heightRatio: 1.0 },
  "1:1.414": { paddingBottom: "141.4%", heightRatio: 1.414 },
};

const GRID_ROW_UNIT = 4;
const GRID_GAP = 4;

const classifyAspectRatio = (width: number, height: number): AspectRatioClass => {
  const ratio = width / height;
  if (ratio >= 1.5) return "16:9";
  if (ratio >= 0.85) return "1:1";
  return "1:1.414";
};

// Column span based on aspect ratio: landscape = 2 cols, portrait/square = 1 col
const getColumnSpan = (ratioClass: AspectRatioClass, columnCount: number): number => {
  if (columnCount === 1) return 1;
  return ratioClass === "16:9" ? 2 : 1;
};

interface PosterContentProps {
  className?: string;
}

export function PosterContent({ className }: PosterContentProps) {
  const t = useTranslations("dashboard.poster");
  const tCommon = useTranslations("common");
  const [activePoster, setActivePoster] = useState<string | null>(null);
  const [displayMode, setDisplayMode] = useState<DisplayMode | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [posters, setPosters] = useState<Poster[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultDisplayMode, setDefaultDisplayMode] = useState<DisplayMode>("left");
  const [aspectRatios, setAspectRatios] = useState<Record<string, AspectRatioClass>>({});
  const [columnCount, setColumnCount] = useState(2);
  const [containerWidth, setContainerWidth] = useState(400);
  const [localSeekTime, setLocalSeekTime] = useState<number | null>(null);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(-1);
  const seekResetTimerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Single source of truth for the armed video poster (cue + live).
  const { armed, arm, clearArmed, goLive, seek, setPlaying, setMuted } = useArmedVideoPoster();

  const MIN_COLUMN_WIDTH = 170;
  const MAX_COLUMN_WIDTH = 240;
  const NARROW_THRESHOLD = 300;

  const calculateColumnCount = useCallback((width: number) => {
    if (width < NARROW_THRESHOLD) return 1;
    if (width <= 0) return 2;
    const minCols = Math.ceil(width / MAX_COLUMN_WIDTH);
    const maxCols = Math.floor(width / MIN_COLUMN_WIDTH);
    return Math.max(2, Math.min(minCols, maxCols) || minCols);
  }, []);

  const calculateRowSpan = useCallback(
    (ratioClass: AspectRatioClass) => {
      const colSpan = getColumnSpan(ratioClass, columnCount);
      const singleColumnWidth = (containerWidth - (columnCount - 1) * GRID_GAP) / columnCount;
      const itemWidth = singleColumnWidth * colSpan + (colSpan - 1) * GRID_GAP;
      const itemHeight = itemWidth * ASPECT_RATIOS[ratioClass].heightRatio;
      return Math.ceil((itemHeight + GRID_GAP) / (GRID_ROW_UNIT + GRID_GAP));
    },
    [containerWidth, columnCount]
  );

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
    const initialWidth = container.offsetWidth;
    setContainerWidth(initialWidth);
    setColumnCount(calculateColumnCount(initialWidth));
    return () => observer.disconnect();
  }, [calculateColumnCount]);

  const handleImageLoad = (posterId: string, e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setAspectRatios((prev) => ({
      ...prev,
      [posterId]: classifyAspectRatio(img.naturalWidth, img.naturalHeight),
    }));
  };

  const handleVideoLoad = (posterId: string, e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget;
    setAspectRatios((prev) => ({
      ...prev,
      [posterId]: classifyAspectRatio(video.videoWidth, video.videoHeight),
    }));
  };

  useEffect(() => {
    fetchPosters();
    fetchDefaultDisplayMode();
  }, []);

  // Sync live image-poster state with the WebSocket overlay state.
  // The armed store handles video posters; this hook tracks images + active
  // ID for badge highlighting and the toggle-off behavior.
  const posterOverlayState = useSyncWithOverlayState({
    overlayType: "poster",
    localActive: activePoster !== null,
    onExternalHide: () => {
      setActivePoster(null);
      setDisplayMode(null);
      setActiveType(null);
    },
    onExternalShow: (state) => {
      if (state.active && "posterId" in state && state.posterId && state.posterId !== activePoster) {
        const poster = posters.find((p) => p.id === state.posterId);
        if (poster) {
          setActivePoster(state.posterId);
          const mode = "displayMode" in state ? state.displayMode : null;
          setDisplayMode((mode as DisplayMode | null) ?? null);
          setActiveType(poster.type);
        }
      }
    },
  });
  const activeOwnerClientId = posterOverlayState.active
    ? posterOverlayState.ownerClientId
    : undefined;
  const canTakeOver =
    posterOverlayState.active &&
    !!activeOwnerClientId &&
    activeOwnerClientId !== CLIENT_ID;

  useEffect(() => {
    return () => {
      if (seekResetTimerRef.current) clearTimeout(seekResetTimerRef.current);
    };
  }, []);

  const fetchPosters = async () => {
    try {
      const data = await apiGet<{ posters: Poster[] }>("/api/assets/posters?enabled=true");
      setPosters(data.posters || []);
    } catch (error) {
      console.error("Failed to fetch posters:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefaultDisplayMode = async () => {
    try {
      const data = await apiGet<{ settings?: { defaultPosterDisplayMode?: string } }>(
        "/api/settings/general"
      );
      const mode = data.settings?.defaultPosterDisplayMode || "left";
      setDefaultDisplayMode(mode as DisplayMode);
    } catch (error) {
      console.error("Failed to fetch default display mode:", error);
    }
  };

  const armPoster = useCallback(
    (poster: Poster, mode: DisplayMode) => {
      arm(
        {
          posterId: poster.id,
          fileUrl: poster.fileUrl,
          type: poster.type as "video" | "youtube",
          startTime: poster.startTime ?? undefined,
          endTime: poster.endTime ?? undefined,
          endBehavior: poster.endBehavior ?? undefined,
          source: poster.source,
          chapters: poster.metadata?.chapters,
          duration: poster.duration ?? undefined,
        },
        mode
      );
    },
    [arm]
  );

  const hideCurrentMode = useCallback(async () => {
    try {
      await apiPost(posterEndpoint(displayMode), { action: PosterEventType.HIDE });
      setActivePoster(null);
      setDisplayMode(null);
      setActiveType(null);
    } catch (error) {
      console.error("Error hiding poster:", error);
    }
  }, [displayMode]);

  const showImageInMode = useCallback(
    async (poster: Poster, mode: DisplayMode): Promise<boolean> => {
      try {
        const payload: Record<string, unknown> = {
          posterId: poster.id,
          fileUrl: poster.fileUrl,
          type: poster.type,
          source: poster.source,
          transition: "fade",
          ownerClientId: CLIENT_ID,
          ...(poster.metadata?.chapters?.length && { chapters: poster.metadata.chapters }),
          ...(poster.startTime != null && { startTime: poster.startTime }),
          ...(poster.endTime != null && { endTime: poster.endTime }),
          ...(poster.endBehavior && { endBehavior: poster.endBehavior }),
        };
        if (mode !== "bigpicture") payload.side = mode;

        await apiPost(posterEndpoint(mode), {
          action: PosterEventType.SHOW,
          payload,
        });

        setActivePoster(poster.id);
        setDisplayMode(mode);
        setActiveType(poster.type);
        return true;
      } catch (error) {
        console.error("Error showing poster:", error);
        return false;
      }
    },
    []
  );

  const handleTogglePoster = async (poster: Poster, mode: DisplayMode) => {
    // Video → arm (or disarm if same poster + same mode already armed and not live).
    if (isVideoPosterType(poster.type)) {
      if (armed && armed.posterId === poster.id && armed.displayMode === mode) {
        if (armed.isLive) {
          await hideCurrentMode();
          clearArmed();
        } else {
          clearArmed();
        }
        return;
      }
      // Switching armed video while another is live: hide the live one first.
      if (armed?.isLive) {
        await hideCurrentMode();
      }
      armPoster(poster, mode);
      return;
    }

    // Image path: clear any armed video, then go-direct-to-OBS.
    if (armed) {
      if (armed.isLive) await hideCurrentMode();
      clearArmed();
    }

    if (activePoster === poster.id && displayMode === mode) {
      await hideCurrentMode();
      return;
    }

    if (activePoster) {
      await hideCurrentMode();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await showImageInMode(poster, mode);
  };

  const handleCardClick = async (poster: Poster) => {
    if (isVideoPosterType(poster.type)) {
      if (armed && armed.posterId === poster.id) {
        if (armed.isLive) {
          await hideCurrentMode();
          clearArmed();
        } else {
          clearArmed();
        }
        return;
      }
      if (armed?.isLive) {
        await hideCurrentMode();
      }
      armPoster(poster, defaultDisplayMode);
      return;
    }

    // Image path
    if (armed) {
      if (armed.isLive) await hideCurrentMode();
      clearArmed();
    }

    if (activePoster === poster.id) {
      await hideCurrentMode();
      return;
    }

    if (activePoster) {
      await hideCurrentMode();
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    await showImageInMode(poster, defaultDisplayMode);
  };

  const handleGoLive = async () => {
    const ok = await goLive();
    if (ok && armed) {
      // Mirror image-side state so the active badges and toggle-off path keep working.
      setActivePoster(armed.posterId);
      setDisplayMode(armed.displayMode);
      setActiveType(armed.type);
    }
  };

  const handleHideArmed = async () => {
    if (!armed) return;
    if (armed.isLive) {
      try {
        await apiPost(posterEndpoint(armed.displayMode), { action: PosterEventType.HIDE });
      } catch (err) {
        console.error("Hide failed:", err);
      }
      setActivePoster(null);
      setDisplayMode(null);
      setActiveType(null);
    }
    clearArmed();
  };

  const handleTakeOver = async () => {
    try {
      await apiPost(posterEndpoint(posterOverlayState.displayMode as DisplayMode | undefined), {
        action: PosterEventType.TAKEOVER,
        payload: { ownerClientId: CLIENT_ID },
      });
    } catch (error) {
      console.error("Takeover error:", error);
      toast.error("Impossible de prendre la main sur la preview.");
    }
  };

  // Chapters drive the unified seek().
  const activeChapters = useMemo<VideoChapter[]>(() => {
    if (!armed) return [];
    const chapters = armed.chapters ?? [];
    return [...chapters].sort((a, b) => a.timestamp - b.timestamp);
  }, [armed]);

  useEffect(() => {
    if (!armed || activeChapters.length === 0) {
      setCurrentChapterIndex(-1);
      return;
    }
    let idx = -1;
    for (let i = 0; i < activeChapters.length; i++) {
      if (activeChapters[i].timestamp <= armed.currentTime) idx = i;
      else break;
    }
    setCurrentChapterIndex(idx);
  }, [armed, activeChapters]);

  const handleChapterNext = () => {
    const next = currentChapterIndex + 1;
    if (next >= activeChapters.length) return;
    seek(activeChapters[next].timestamp);
  };

  const handleChapterPrev = () => {
    const prev = Math.max(0, currentChapterIndex - 1);
    if (!activeChapters[prev]) return;
    seek(activeChapters[prev].timestamp);
  };

  const handleChapterJump = (chapterIndex: number) => {
    const target = activeChapters[chapterIndex];
    if (target) seek(target.timestamp);
  };

  // Dashboard-specific compact format (e.g., "2h05") — differs from formatDurationString (H:MM:SS)
  const formatDuration = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds) || seconds === 0) {
      return tCommon("unknown");
    }
    if (seconds >= 3600) {
      const hours = Math.floor(seconds / 3600);
      const mins = Math.floor((seconds % 3600) / 60);
      return `${hours}h${mins.toString().padStart(2, "0")}`;
    }
    return formatTimeShort(seconds);
  };

  // Sub-clip math for the timeline display (chapter + currentTime offsets relative to clipStart).
  const clipStart = armed?.startTime ?? 0;
  const clipEnd = armed?.endTime ?? 0;
  const hasSubClip = clipStart > 0 || clipEnd > 0;
  const displayCurrentTime = armed
    ? hasSubClip
      ? Math.max(0, armed.currentTime - clipStart)
      : armed.currentTime
    : 0;
  const displayDuration = armed
    ? armed.endTime != null
      ? Math.max(0, armed.endTime - clipStart)
      : getEffectivePosterDuration({
          playbackDuration: armed.duration,
          posterDuration: posters.find((p) => p.id === armed.posterId)?.duration,
          clipStart,
          clipEnd,
        })
    : 0;

  return (
    <>
      <div className={cn("space-y-3", className)}>
        <PosterQuickAdd
          onPosterAdded={fetchPosters}
          onPosterDisplayed={(poster, mode) => {
            // QuickAdd always sends to OBS directly (it's an image flow).
            showImageInMode(poster, mode);
          }}
        />

        <div ref={containerRef} className="h-full w-full">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{tCommon("loading")}</div>
          ) : posters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">{t("noPoster")}</div>
          ) : (
            <ScrollArea className="h-full w-full">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
                  gridAutoRows: `${GRID_ROW_UNIT}px`,
                  gap: `${GRID_GAP}px`,
                }}
              >
                {posters.map((poster) => {
                  const ratioClass = aspectRatios[poster.id] || "16:9";
                  const rowSpan = calculateRowSpan(ratioClass);
                  const colSpan = getColumnSpan(ratioClass, columnCount);
                  const isVideo = isVideoPosterType(poster.type);
                  const isArmedHere = armed?.posterId === poster.id;
                  const isLiveHere = activePoster === poster.id;

                  return (
                    <div
                      key={poster.id}
                      className={cn(
                        "group relative rounded-lg overflow-hidden border-2 transition-all cursor-pointer",
                        isLiveHere
                          ? "border-green-500 ring-2 ring-green-500 ring-offset-2"
                          : "border-border hover:border-primary"
                      )}
                      style={{
                        gridRowEnd: `span ${rowSpan}`,
                        gridColumn: `span ${colSpan}`,
                      }}
                      title={poster.title}
                      onClick={() => handleCardClick(poster)}
                    >
                      <div className="relative w-full h-full">
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
                          poster.thumbnailUrl ? (
                            <img
                              src={poster.thumbnailUrl}
                              alt={poster.title}
                              className="absolute inset-0 w-full h-full object-cover"
                              onLoad={(e) => handleImageLoad(poster.id, e)}
                            />
                          ) : (
                            <video
                              src={poster.fileUrl}
                              className="absolute inset-0 w-full h-full object-cover"
                              muted
                              onLoadedMetadata={(e) => handleVideoLoad(poster.id, e)}
                            />
                          )
                        ) : (
                          <img
                            src={poster.fileUrl}
                            alt={poster.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            onLoad={(e) => handleImageLoad(poster.id, e)}
                          />
                        )}

                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 pointer-events-none">
                          <span className="text-white text-xs font-medium text-center line-clamp-2">
                            {poster.title}
                          </span>
                        </div>
                      </div>

                      {/* Position buttons on hover */}
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center gap-1 z-10">
                        <div className="flex gap-1">
                          <PositionButton
                            poster={poster}
                            mode="left"
                            label={`← ${t("positions.left")}`}
                            ariaLabel={t("ariaShowLeft", { title: poster.title })}
                            armed={armed}
                            activePoster={activePoster}
                            displayMode={displayMode}
                            onClick={handleTogglePoster}
                          />
                          <PositionButton
                            poster={poster}
                            mode="right"
                            label={`${t("positions.right")} →`}
                            ariaLabel={t("ariaShowRight", { title: poster.title })}
                            armed={armed}
                            activePoster={activePoster}
                            displayMode={displayMode}
                            onClick={handleTogglePoster}
                          />
                        </div>
                        <PositionButton
                          poster={poster}
                          mode="bigpicture"
                          label={t("positions.big")}
                          ariaLabel={t("ariaShowBig", { title: poster.title })}
                          armed={armed}
                          activePoster={activePoster}
                          displayMode={displayMode}
                          onClick={handleTogglePoster}
                        />
                      </div>

                      {/* Live badge */}
                      {isLiveHere && (
                        <div className="absolute top-1 right-1 flex items-center gap-1 bg-green-500 rounded-full px-2 py-1 pointer-events-none">
                          <Eye className="w-3 h-3 text-white" />
                          <span className="text-white text-[10px] font-semibold">
                            {displayMode === "left" ? "L" : displayMode === "right" ? "R" : ""}
                          </span>
                        </div>
                      )}

                      {/* Cue badge: armed but not yet live */}
                      {isVideo && isArmedHere && !armed?.isLive && (
                        <div className="absolute top-1 right-1 flex items-center gap-1 bg-blue-500 rounded-full px-2 py-1 pointer-events-none">
                          <Film className="w-3 h-3 text-white" />
                          <span className="text-white text-[10px] font-semibold">
                            {armed?.displayMode === "left"
                              ? "L"
                              : armed?.displayMode === "right"
                              ? "R"
                              : "B"}
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

      {/* Unified video timeline — visible iff something is armed (cue or live). */}
      {armed && (
        <div className="fixed bottom-4 left-4 right-4 p-4 border rounded-lg bg-background shadow-lg z-50">
          <div className="flex items-center gap-2 mb-2">
            <Button size="sm" onClick={() => setPlaying(!armed.isPlaying)} variant="outline">
              {armed.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            {armed.isLive && (
              <Button size="sm" onClick={() => setMuted(!armed.isMuted)} variant="outline">
                {armed.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
            )}

            {activeChapters.length > 0 && (
              <>
                <div className="h-4 w-px bg-border mx-1" />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleChapterPrev}
                  disabled={currentChapterIndex <= 0}
                  title={t("chapterPrev")}
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="min-w-[120px] justify-between">
                      <span className="truncate text-xs">
                        {currentChapterIndex >= 0
                          ? activeChapters[currentChapterIndex]?.title || t("chapter")
                          : t("chapters")}
                      </span>
                      <ChevronDown className="w-3 h-3 ml-1 shrink-0" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                    {activeChapters.map((chapter, idx) => (
                      <DropdownMenuItem
                        key={chapter.id}
                        onClick={() => handleChapterJump(idx)}
                        className={cn(
                          "flex justify-between gap-2",
                          idx === currentChapterIndex && "bg-accent"
                        )}
                      >
                        <span className="truncate">{chapter.title}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatTimeShort(
                            hasSubClip
                              ? Math.max(0, chapter.timestamp - clipStart)
                              : chapter.timestamp
                          )}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleChapterNext}
                  disabled={currentChapterIndex >= activeChapters.length - 1}
                  title={t("chapterNext")}
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
              </>
            )}

            {armed.isLive && canTakeOver && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleTakeOver}
                className="ml-2"
                title="La preview est contrôlée par un autre opérateur. Cliquer pour prendre la main."
              >
                <Hand className="mr-1 h-3 w-3" /> Prendre la main
              </Button>
            )}

            <span className="text-sm ml-auto">
              {formatTimeShort(displayCurrentTime)} / {formatDuration(displayDuration)}
            </span>

            {armed.isLive ? (
              <Button
                size="sm"
                onClick={handleHideArmed}
                className="ml-2 bg-red-600 hover:bg-red-700 text-white"
              >
                <EyeOff className="mr-1 h-3 w-3" /> {t("hide")}
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleGoLive}
                className="ml-2 bg-green-600 hover:bg-green-700 text-white"
              >
                <Send className="mr-1 h-3 w-3" /> Go Live
              </Button>
            )}
          </div>
          <VideoTimeline
            duration={displayDuration}
            chapters={
              hasSubClip
                ? activeChapters
                    .filter((ch) => ch.timestamp >= clipStart && (!clipEnd || ch.timestamp <= clipEnd))
                    .map((ch) => ({ ...ch, timestamp: ch.timestamp - clipStart }))
                : activeChapters
            }
            currentTime={localSeekTime ?? displayCurrentTime}
            onSeek={(time) => {
              const absoluteTime = hasSubClip ? time + clipStart : time;
              setLocalSeekTime(time);
              seek(absoluteTime);
              if (seekResetTimerRef.current) clearTimeout(seekResetTimerRef.current);
              seekResetTimerRef.current = setTimeout(() => setLocalSeekTime(null), 1500);
            }}
          />
        </div>
      )}
    </>
  );
}

interface PositionButtonProps {
  poster: Poster;
  mode: DisplayMode;
  label: string;
  ariaLabel: string;
  armed: ReturnType<typeof useArmedVideoPoster>["armed"];
  activePoster: string | null;
  displayMode: DisplayMode | null;
  onClick: (poster: Poster, mode: DisplayMode) => void;
}

/** Button highlight: blue while armed (cue), green while live, secondary otherwise. */
function PositionButton({
  poster,
  mode,
  label,
  ariaLabel,
  armed,
  activePoster,
  displayMode,
  onClick,
}: PositionButtonProps) {
  const isVideo = isVideoPosterType(poster.type);
  const isArmedHere =
    isVideo && armed?.posterId === poster.id && armed.displayMode === mode && !armed.isLive;
  const isLiveHere = activePoster === poster.id && displayMode === mode;

  return (
    <Button
      size="sm"
      variant={isArmedHere || isLiveHere ? "default" : "secondary"}
      onClick={(e) => {
        e.stopPropagation();
        onClick(poster, mode);
      }}
      className={cn(
        "px-2 py-1 h-auto text-xs",
        isArmedHere && "bg-blue-500 hover:bg-blue-600 text-white",
        isLiveHere && "bg-green-500 hover:bg-green-600"
      )}
      aria-label={ariaLabel}
    >
      {label}
    </Button>
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

"use client";

import { useState, useEffect, useRef } from "react";
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
 * PosterCard - Thumbnail gallery for quick poster triggering
 */
type DisplayMode = "left" | "right" | "bigpicture";

export function PosterCard({ size, className, settings }: PosterCardProps = {}) {
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
  const seekTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

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
      <Card className={cn(className)}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {t("title")}
            <div
              className={`w-3 h-3 rounded-full ${activePoster ? "bg-green-500" : "bg-gray-300"
                }`}
            />
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Quick Add Component */}
          <PosterQuickAdd
            onPosterAdded={fetchPosters}
            onPosterDisplayed={(poster, mode) => {
              showInMode(poster, mode);
            }}
          />

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">{tCommon("loading")}</div>
          ) : posters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("noPoster")}
            </div>
          ) : (
            <ScrollArea className="h-[500px] w-full">
              <div className="grid grid-cols-2 gap-2 pr-4">
                {posters.map((poster) => (
                  <div
                    key={poster.id}
                    className={`group relative aspect-video rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${activePoster === poster.id
                        ? "border-green-500 ring-2 ring-green-500 ring-offset-2"
                        : "border-border hover:border-primary"
                      }`}
                    title={poster.title}
                    onClick={() => handleCardClick(poster)}
                  >
                    {/* Preview */}
                    {poster.type === "youtube" ? (
                      <div className="relative w-full h-full">
                        <img
                          src={`https://img.youtube.com/vi/${poster.fileUrl.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([^?&]+)/)?.[1]}/mqdefault.jpg`}
                          alt={poster.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
                          <Eye className="w-6 h-6 text-white" />
                        </div>
                      </div>
                    ) : poster.type === "video" ? (
                      <video
                        src={poster.fileUrl}
                        className="w-full h-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={poster.fileUrl}
                        alt={poster.title}
                        className="w-full h-full object-cover"
                      />
                    )}

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
                        🖼️ {t("positions.big")}
                      </Button>
                    </div>

                    {/* Active indicator badge */}
                    {activePoster === poster.id && (
                      <div className="absolute top-1 right-1 flex items-center gap-1 bg-green-500 rounded-full px-2 py-1 pointer-events-none">
                        <Eye className="w-3 h-3 text-white" />
                        <span className="text-white text-[10px] font-semibold">
                          {displayMode === "left" ? "L" : displayMode === "right" ? "R" : "⛶"}
                        </span>
                      </div>
                    )}

                    {/* Hover overlay with title */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 pointer-events-none">
                      <span className="text-white text-xs font-medium text-center line-clamp-2">
                        {poster.title}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

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


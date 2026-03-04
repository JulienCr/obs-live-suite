"use client";

import { type IDockviewPanelProps } from "dockview-react";
import { useCallback } from "react";
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Square,
  RotateCcw,
  Volume2,
  Wifi,
  WifiOff,
  Music,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { apiPost, isClientFetchError } from "@/lib/utils/ClientFetch";
import { useMediaPlayer } from "@/hooks/useMediaPlayer";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { MediaPlayerDriverId, MediaPlayerAction } from "@/lib/models/MediaPlayer";

/**
 * MediaPlayerPanel - Generic transport control panel for media player drivers.
 *
 * Receives `driverId` via Dockview panel params. Shows connection status,
 * now-playing info (track/artist/time), and transport control buttons.
 */
export function MediaPlayerPanel(props: IDockviewPanelProps<{ driverId: MediaPlayerDriverId }>) {
  const driverId = props.params?.driverId ?? "artlist";
  const config: PanelConfig = { id: `mediaPlayer-${driverId}`, context: "dashboard" };

  const { connected, status, wsConnected } = useMediaPlayer(driverId);
  const { toast } = useToast();

  const sendAction = useCallback(
    async (action: MediaPlayerAction) => {
      try {
        await apiPost(`/api/media-player/${driverId}/${action}`);
      } catch (error) {
        const msg = isClientFetchError(error) ? error.errorMessage : "Command failed";
        toast({ title: "Media Player", description: msg, variant: "destructive" });
      }
    },
    [driverId, toast]
  );

  const isPlaying = status?.playing ?? false;
  const driverLabel = driverId.charAt(0).toUpperCase() + driverId.slice(1);

  return (
    <BasePanelWrapper config={config}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Music className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">{driverLabel}</span>
        </div>
        <div className="flex items-center gap-1">
          {wsConnected ? (
            <Wifi className={cn("h-4 w-4", connected ? "text-green-500" : "text-muted-foreground")} />
          ) : (
            <WifiOff className="h-4 w-4 text-destructive" />
          )}
          <span className="text-xs text-muted-foreground">
            {!wsConnected ? "WS offline" : connected ? "Connected" : "Waiting..."}
          </span>
        </div>
      </div>

      {/* Now Playing */}
      <div className="p-3 rounded-lg bg-muted/50 mb-3 min-h-[60px]">
        {status ? (
          <div className="space-y-1">
            <div className="text-sm font-medium truncate" title={status.track ?? undefined}>
              {status.track || "No track"}
            </div>
            <div className="text-xs text-muted-foreground truncate" title={status.artist ?? undefined}>
              {status.artist || "Unknown artist"}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {status.current ?? "--:--"} / {status.total ?? "--:--"}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            {connected ? (
              <>
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Loading status...
              </>
            ) : (
              "No driver connected"
            )}
          </div>
        )}
      </div>

      {/* Transport Controls */}
      <div className="flex items-center justify-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => sendAction("prev")}
          disabled={!connected}
          title="Previous"
        >
          <SkipBack className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => sendAction("replay")}
          disabled={!connected}
          title="Replay"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>

        <Button
          variant={isPlaying ? "secondary" : "default"}
          size="icon"
          className="h-10 w-10"
          onClick={() => sendAction(isPlaying ? "pause" : "play")}
          disabled={!connected}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => sendAction("stop")}
          disabled={!connected}
          title="Stop"
        >
          <Square className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => sendAction("next")}
          disabled={!connected}
          title="Next"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* Fadeout button */}
      <div className="flex justify-center mt-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => sendAction("fadeout")}
          disabled={!connected || !isPlaying}
          title="Fade out and stop (5s)"
        >
          <Volume2 className="h-3 w-3 mr-1" />
          Fadeout
        </Button>
      </div>
    </BasePanelWrapper>
  );
}

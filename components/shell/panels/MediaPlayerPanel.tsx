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
  Loader2,
  Music,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { apiPost, isClientFetchError } from "@/lib/utils/ClientFetch";
import { useMediaPlayer } from "@/hooks/useMediaPlayer";
import { BasePanelWrapper, type PanelConfig } from "@/components/panels";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import type { MediaPlayerDriverId, MediaPlayerAction } from "@/lib/models/MediaPlayer";

/**
 * MediaPlayerPanel - Compact toolbar-style transport control for media player drivers.
 *
 * Receives `driverId` via Dockview panel params. Single-row layout:
 * status dot | transport buttons | fadeout | track info + time.
 */
export function MediaPlayerPanel(props: IDockviewPanelProps<{ driverId: MediaPlayerDriverId }>) {
  const driverId = props.params?.driverId ?? "artlist";
  const panelId = props.api?.id ?? `mediaPlayer-${driverId}`;
  const config: PanelConfig = { id: panelId, context: "dashboard" };

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
  const isOnline = wsConnected && connected;

  return (
    <BasePanelWrapper config={config}>
      <div className="flex items-center gap-1.5 h-8">
        {/* Status dot */}
        <div
          className={cn(
            "h-2 w-2 rounded-full shrink-0",
            !wsConnected ? "bg-destructive" : connected ? "bg-green-500" : "bg-yellow-500 animate-pulse"
          )}
          title={!wsConnected ? "WS offline" : connected ? "Connected" : "Waiting..."}
        />

        {/* Transport controls */}
        <div className="flex items-center shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => sendAction("prev")} disabled={!isOnline} title="Previous">
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => sendAction("replay")} disabled={!isOnline} title="Replay">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={isPlaying ? "secondary" : "default"}
            size="icon"
            className="h-8 w-8 mx-0.5"
            onClick={() => sendAction(isPlaying ? "pause" : "play")}
            disabled={!isOnline}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => sendAction("stop")} disabled={!isOnline} title="Stop">
            <Square className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => sendAction("next")} disabled={!isOnline} title="Next">
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Fadeout */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => sendAction("fadeout")}
          disabled={!isOnline || !isPlaying}
          title="Fade out and stop (5s)"
        >
          <Volume2 className="h-3.5 w-3.5" />
        </Button>

        {/* Separator */}
        <div className="w-px h-4 bg-border shrink-0" />

        {/* Track info - scrolls if too long */}
        <div className="flex-1 min-w-0 overflow-hidden">
          {status ? (
            <div className="flex items-center gap-2">
              {status.artworkUrl ? (
                <img src={status.artworkUrl} alt="" className="h-8 w-8 rounded shrink-0 object-cover" />
              ) : (
                <div className="h-8 w-8 rounded shrink-0 bg-muted flex items-center justify-center">
                  <Music className="h-4 w-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1 overflow-hidden">
                <div
                  className="truncate text-xs text-muted-foreground"
                  title={`${status.artist || "Unknown"} - ${status.track || "No track"}`}
                >
                  <span className="font-medium text-foreground">{status.artist || "Unknown"}</span>
                  {" - "}
                  {status.track || "No track"}
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                {status.current ?? "--:--"}/{status.total ?? "--:--"}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">
              {connected ? (
                <span className="flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Loading...
                </span>
              ) : (
                "No driver"
              )}
            </span>
          )}
        </div>
      </div>
    </BasePanelWrapper>
  );
}

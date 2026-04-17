"use client";

import { useCallback, useMemo, useState } from "react";
import { useOverlayActiveState } from "./useOverlayActiveState";
import { useWebSocketChannel } from "./useWebSocketChannel";
import { useCuedPoster, type CuedPosterState } from "./useCuedPoster";
import { CLIENT_ID } from "@/lib/utils/clientId";

export interface PreviewPlaybackState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
}

/** Minimal poster info the preview needs to render its player. */
export interface PreviewPoster {
  id: string;
  fileUrl: string;
  type: "video" | "youtube";
  startTime?: number;
  endTime?: number;
  endBehavior?: "stop" | "loop";
}

export type PreviewState =
  | {
      mode: "cue";
      poster: PreviewPoster;
      cue: CuedPosterState;
      /** In cue mode the preview is the source of truth; the player reports
       *  back via the hook's updateCueTime / updateCuePlaying. */
      updateCueTime: (t: number) => void;
      updateCuePlaying: (playing: boolean) => void;
      clearCue: () => void;
    }
  | {
      mode: "live";
      poster: PreviewPoster;
      displayMode: "left" | "right" | "bigpicture";
      playback: PreviewPlaybackState;
    }
  | null;

export interface UsePosterPreviewStateOptions {
  /** Full list of available posters, used to resolve the cued poster by id. */
  posters: Array<{
    id: string;
    fileUrl: string;
    type: string;
    startTime?: number | null;
    endTime?: number | null;
    endBehavior?: "stop" | "loop" | null;
  }>;
}

function toPreviewPoster(
  poster: UsePosterPreviewStateOptions["posters"][number] | undefined
): PreviewPoster | null {
  if (!poster) return null;
  if (poster.type !== "video" && poster.type !== "youtube") return null;
  return {
    id: poster.id,
    fileUrl: poster.fileUrl,
    type: poster.type,
    startTime: poster.startTime ?? undefined,
    endTime: poster.endTime ?? undefined,
    endBehavior: poster.endBehavior ?? undefined,
  };
}

/**
 * Arbitrates what the floating regie preview should display right now:
 *  - "cue": a locally-staged video the owner is aligning before sending to air.
 *  - "live": mirrors the overlay state (only for the owner who launched it).
 *  - null: nothing to preview.
 *
 * Ownership is determined via CLIENT_ID vs. the active poster's ownerClientId
 * broadcast by the backend. The backend replays the show event on re-subscribe
 * so this resolves correctly after a dashboard reload.
 */
export function usePosterPreviewState({
  posters,
}: UsePosterPreviewStateOptions): PreviewState {
  const overlayState = useOverlayActiveState();
  const { cue, updateCueTime, updateCuePlaying, clearCue } = useCuedPoster();

  const activePoster = overlayState.poster;
  const isOwner = !!activePoster.active && activePoster.ownerClientId === CLIENT_ID;

  // Live-mirror playback state arrives over the same channel the overlay uses
  // to broadcast its 1Hz state ticks. Owned by whichever channel is active.
  const [playback, setPlayback] = useState<PreviewPlaybackState>({
    currentTime: 0,
    duration: 0,
    isPlaying: false,
  });
  const liveChannel = activePoster.displayMode === "bigpicture" ? "poster-bigpicture" : "poster";
  const handleLiveMessage = useCallback((data: Record<string, unknown>) => {
    const next: Partial<PreviewPlaybackState> = {};
    if (typeof data.currentTime === "number" && Number.isFinite(data.currentTime)) {
      next.currentTime = data.currentTime;
    }
    if (typeof data.duration === "number" && Number.isFinite(data.duration) && data.duration > 0) {
      next.duration = data.duration;
    }
    if (typeof data.isPlaying === "boolean") {
      next.isPlaying = data.isPlaying;
    }
    if (Object.keys(next).length > 0) {
      setPlayback((prev) => ({ ...prev, ...next }));
    }
  }, []);
  useWebSocketChannel(liveChannel, handleLiveMessage, {
    enabled: isOwner,
    logPrefix: "PosterPreview",
  });

  return useMemo<PreviewState>(() => {
    if (isOwner) {
      const livePoster: PreviewPoster | null =
        activePoster.fileUrl && (activePoster.type === "video" || activePoster.type === "youtube")
          ? {
              id: activePoster.posterId ?? "live",
              fileUrl: activePoster.fileUrl,
              type: activePoster.type,
              startTime: activePoster.subVideoStart,
              endTime: activePoster.subVideoEnd,
              endBehavior: activePoster.subVideoEndBehavior,
            }
          : null;
      if (!livePoster) return null;
      return {
        mode: "live",
        poster: livePoster,
        displayMode: activePoster.displayMode ?? "left",
        playback,
      };
    }

    if (cue && !activePoster.active) {
      const cuedPoster = toPreviewPoster(posters.find((p) => p.id === cue.posterId));
      if (!cuedPoster) return null;
      return {
        mode: "cue",
        poster: cuedPoster,
        cue,
        updateCueTime,
        updateCuePlaying,
        clearCue,
      };
    }

    return null;
  }, [isOwner, activePoster, cue, posters, playback, updateCueTime, updateCuePlaying, clearCue]);
}

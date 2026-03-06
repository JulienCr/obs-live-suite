"use client";

import { useCallback, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import {
  MEDIA_PLAYER_CHANNEL,
  type MediaPlayerDashboardEvent,
  type MediaPlayerDriverId,
  type MediaPlayerStatus,
} from "@/lib/models/MediaPlayer";
import { NowPlayingDisplay } from "./NowPlayingDisplay";
import { OverlayMotionProvider } from "./OverlayMotionProvider";

interface NowPlayingState extends Pick<MediaPlayerStatus, "artworkUrl" | "track" | "artist"> {
  visible: boolean;
  driverId: MediaPlayerDriverId | null;
}

/**
 * NowPlayingRenderer manages WebSocket connection and state for the now-playing overlay.
 * Shows whichever driver is currently playing; hides immediately when playback stops.
 */
export function NowPlayingRenderer() {
  const [state, setState] = useState<NowPlayingState>({
    visible: false,
    artworkUrl: null,
    track: null,
    artist: null,
    driverId: null,
  });

  const handleMessage = useCallback((data: MediaPlayerDashboardEvent) => {
    switch (data.type) {
      case "status": {
        const { status, driverId } = data;

        if (status.playing && status.track) {
          setState((prev) => {
            if (prev.visible && prev.track === status.track &&
                prev.artist === status.artist && prev.artworkUrl === status.artworkUrl &&
                prev.driverId === driverId) {
              return prev;
            }
            return { visible: true, artworkUrl: status.artworkUrl, track: status.track, artist: status.artist, driverId };
          });
        } else if (!status.playing) {
          setState((prev) => ({ ...prev, visible: false }));
        }
        break;
      }

      case "disconnected":
        setState((prev) =>
          prev.driverId === data.driverId ? { ...prev, visible: false } : prev
        );
        break;
    }
  }, []);

  useWebSocketChannel<MediaPlayerDashboardEvent>(
    MEDIA_PLAYER_CHANNEL,
    handleMessage,
    { logPrefix: "NowPlaying" }
  );

  return (
    <OverlayMotionProvider>
      <AnimatePresence>
        {state.visible && state.track && (
          <NowPlayingDisplay
            key={`${state.driverId}-${state.track}`}
            artworkUrl={state.artworkUrl}
            track={state.track}
            artist={state.artist}
            driverId={state.driverId}
          />
        )}
      </AnimatePresence>
    </OverlayMotionProvider>
  );
}

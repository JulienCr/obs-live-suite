"use client";

import { useCallback, useState, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import {
  MEDIA_PLAYER_CHANNEL,
  type MediaPlayerDashboardEvent,
  type MediaPlayerDriverId,
} from "@/lib/models/MediaPlayer";
import { NowPlayingDisplay } from "./NowPlayingDisplay";
import { OverlayMotionProvider } from "./OverlayMotionProvider";

interface NowPlayingState {
  visible: boolean;
  artworkUrl: string | null;
  track: string | null;
  artist: string | null;
  driverId: MediaPlayerDriverId | null;
}

const HIDE_DELAY_MS = 3000;

/**
 * NowPlayingRenderer manages WebSocket connection and state for the now-playing overlay.
 * Shows whichever driver is currently playing; hides after playback stops.
 */
export function NowPlayingRenderer() {
  const [state, setState] = useState<NowPlayingState>({
    visible: false,
    artworkUrl: null,
    track: null,
    artist: null,
    driverId: null,
  });

  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleMessage = useCallback((data: MediaPlayerDashboardEvent) => {
    switch (data.type) {
      case "status": {
        const { status, driverId } = data;

        if (status.playing && status.track) {
          // Clear any pending hide
          if (hideTimeout.current) {
            clearTimeout(hideTimeout.current);
            hideTimeout.current = undefined;
          }

          setState({
            visible: true,
            artworkUrl: status.artworkUrl,
            track: status.track,
            artist: status.artist,
            driverId,
          });
        } else if (!status.playing) {
          // Delay hiding so the card doesn't flicker on brief pauses
          if (hideTimeout.current) return;
          hideTimeout.current = setTimeout(() => {
            setState((prev) => ({ ...prev, visible: false }));
            hideTimeout.current = undefined;
          }, HIDE_DELAY_MS);
        }
        break;
      }

      case "disconnected":
        if (hideTimeout.current) {
          clearTimeout(hideTimeout.current);
          hideTimeout.current = undefined;
        }
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

"use client";

import { useCallback, useState } from "react";
import { useWebSocketChannel } from "./useWebSocketChannel";
import type {
  MediaPlayerDriverId,
  MediaPlayerStatus,
  MediaPlayerDashboardEvent,
} from "@/lib/models/MediaPlayer";

export interface UseMediaPlayerReturn {
  /** Whether the driver's Chrome extension tab is connected */
  connected: boolean;
  /** Latest playback status from the driver */
  status: MediaPlayerStatus | null;
  /** Whether the WS channel to the hub is connected */
  wsConnected: boolean;
}

/**
 * Hook for subscribing to media player driver status updates via WebSocket.
 * Filters events by driverId so each panel only sees its driver's data.
 */
export function useMediaPlayer(driverId: MediaPlayerDriverId): UseMediaPlayerReturn {
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<MediaPlayerStatus | null>(null);

  const handleMessage = useCallback(
    (data: MediaPlayerDashboardEvent) => {
      // Only process events for this driver
      if (data.driverId !== driverId) return;

      switch (data.type) {
        case "status":
          setStatus(data.status);
          setConnected(true);
          break;
        case "connected":
          setConnected(true);
          break;
        case "disconnected":
          setConnected(false);
          setStatus(null);
          break;
      }
    },
    [driverId]
  );

  const { isConnected: wsConnected } = useWebSocketChannel<MediaPlayerDashboardEvent>(
    "media-player",
    handleMessage,
    { logPrefix: `MediaPlayer:${driverId}` }
  );

  return { connected, status, wsConnected };
}

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useYouTubeIframeApi } from "@/hooks/useYouTubeIframeApi";

/**
 * Playback state for video and YouTube media
 */
export interface PlaybackState {
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
}

/**
 * Options for the usePosterPlayback hook
 */
export interface UsePosterPlaybackOptions {
  /** Channel name for state updates */
  channelName: "poster" | "poster-bigpicture";
  /** Function to send WebSocket messages */
  send: (data: unknown) => void;
  /** Whether a poster is currently active (state.current !== null) */
  isActive: boolean;
  /** Type of media being displayed */
  mediaType: "image" | "video" | "youtube" | null;
  /** Current poster file URL (used to detect new shows and cue YouTube). */
  fileUrl?: string | null;
  /** Resume position passed by the operator (resumeFrom). */
  initialTime?: number;
  /** Whether the operator wants playback to start (resumePlaying). */
  initialPlaying?: boolean;
}

/**
 * Return type for the usePosterPlayback hook
 */
export interface UsePosterPlaybackReturn {
  /** Current playback state */
  playbackState: PlaybackState;
  /** Setter for playback state */
  setPlaybackState: React.Dispatch<React.SetStateAction<PlaybackState>>;
  /** Reference to video element */
  videoRef: React.RefObject<HTMLVideoElement | null>;
  /** Reference to YouTube iframe */
  youtubeRef: React.RefObject<HTMLIFrameElement | null>;
  /** Mutable reference to YouTube state (for external updates) */
  youtubeStateRef: React.MutableRefObject<PlaybackState>;
  /** Get current playback time from video or YouTube */
  getCurrentTime: () => number;
  /** Seek to a specific time in the video/YouTube player */
  seekToTime: (time: number) => void;
  /** Whether YouTube player is ready */
  youtubePlayerReady: boolean;
  /** Setter for YouTube player ready state */
  setYoutubePlayerReady: React.Dispatch<React.SetStateAction<boolean>>;
  /** Call this when the YouTube iframe fires onLoad (pass to PosterDisplay) */
  handleYouTubeIframeLoad: () => void;
}

/**
 * Default playback state values
 */
const DEFAULT_PLAYBACK_STATE: PlaybackState = {
  isPlaying: false,
  isMuted: true,
  currentTime: 0,
  duration: 0,
};

/**
 * Hook for managing media playback state and controls in poster overlays.
 * Handles both HTML5 video and YouTube iframe players.
 *
 * Features:
 * - Unified playback state for video and YouTube
 * - Automatic state reporting every second
 * - YouTube postMessage API integration via useYouTubeIframeApi
 * - Seek functionality for both player types
 *
 * @param options - Configuration options
 * @returns Playback state, refs, and control functions
 */
export function usePosterPlayback(
  options: UsePosterPlaybackOptions
): UsePosterPlaybackReturn {
  const { channelName, send, isActive, mediaType, fileUrl, initialTime, initialPlaying } = options;

  // Playback state
  const [playbackState, setPlaybackState] = useState<PlaybackState>(DEFAULT_PLAYBACK_STATE);
  const [youtubePlayerReady, setYoutubePlayerReady] = useState(false);

  // Refs for media elements
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeRef = useRef<HTMLIFrameElement | null>(null);

  // YouTube iframe API (shared hook)
  const youtubeListenerId =
    channelName === "poster" ? "poster-overlay" : "bigpicture-poster-overlay";

  const youtubeApi = useYouTubeIframeApi({
    iframeRef: youtubeRef,
    listenerId: youtubeListenerId,
    enabled: isActive && mediaType === "youtube",
    pollingInterval: 500,
  });

  // Alias: youtubeStateRef points at the shared hook's stateRef
  // We cast because PlaybackState is a superset of YouTubeIframeState
  const youtubeStateRef = youtubeApi.stateRef as React.MutableRefObject<PlaybackState>;

  /**
   * Get current playback time from video or YouTube player
   */
  const getCurrentTime = useCallback((): number => {
    if (videoRef.current) {
      return videoRef.current.currentTime;
    }
    return youtubeStateRef.current.currentTime;
  }, [youtubeStateRef]);

  /**
   * Seek to a specific time in the video/YouTube player
   */
  const seekToTime = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
    if (youtubeRef.current) {
      youtubeApi.seek(time);
    }
    setPlaybackState((prev) => ({ ...prev, currentTime: time }));
  }, [youtubeApi]);

  /**
   * Effect: Report video playback state every second
   * Only runs when active and media type is video
   */
  useEffect(() => {
    if (!isActive || mediaType !== "video") {
      return;
    }

    const last: PlaybackState = { currentTime: NaN, duration: NaN, isPlaying: false, isMuted: false };
    let primed = false;
    const interval = setInterval(() => {
      if (!videoRef.current) return;
      const currentTime = videoRef.current.currentTime || 0;
      const duration = videoRef.current.duration || 0;
      const isPlaying = !videoRef.current.paused;
      const isMuted = videoRef.current.muted;

      const changed =
        !primed ||
        currentTime !== last.currentTime ||
        duration !== last.duration ||
        isPlaying !== last.isPlaying ||
        isMuted !== last.isMuted;
      if (!changed) return;

      primed = true;
      last.currentTime = currentTime;
      last.duration = duration;
      last.isPlaying = isPlaying;
      last.isMuted = isMuted;

      setPlaybackState({ currentTime, duration, isPlaying, isMuted });

      // Skip WS broadcast until duration is known so we don't ship currentTime: 0
      // before the video has loaded and seeked to startTime.
      if (duration > 0) {
        send({
          type: "state",
          channel: channelName,
          data: { currentTime, duration, isPlaying, isMuted },
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, mediaType, send, channelName]);

  /**
   * Effect: Report YouTube playback state every second via WebSocket
   * The shared useYouTubeIframeApi hook handles postMessage listening;
   * this effect just syncs its state to the dashboard via WebSocket.
   */
  useEffect(() => {
    if (!isActive || mediaType !== "youtube") {
      return;
    }

    const last: PlaybackState = { currentTime: NaN, duration: NaN, isPlaying: false, isMuted: false };
    const flush = (force: boolean) => {
      const s = youtubeStateRef.current;
      const changed =
        force ||
        s.currentTime !== last.currentTime ||
        s.duration !== last.duration ||
        s.isPlaying !== last.isPlaying ||
        s.isMuted !== last.isMuted;
      if (!changed) return;
      last.currentTime = s.currentTime;
      last.duration = s.duration;
      last.isPlaying = s.isPlaying;
      last.isMuted = s.isMuted;
      setPlaybackState({ ...s });
      send({ type: "state", channel: channelName, data: s });
    };

    // Send initial state immediately so the dashboard reflects the player ASAP.
    flush(true);

    const stateInterval = setInterval(() => flush(false), 1000);
    return () => clearInterval(stateInterval);
  }, [isActive, mediaType, send, channelName, youtubeStateRef]);

  // Track YouTube readiness from the shared hook
  useEffect(() => {
    if (youtubeApi.isSubscribed) {
      setYoutubePlayerReady(true);
    }
  }, [youtubeApi.isSubscribed]);

  // Armed-paused YouTube: PosterDisplay forces autoplay=true so a frame
  // actually renders (cueVideoById only loads the thumbnail). The instant the
  // player reports playing, pause + seek so the audience sees ~1–2 frames of
  // muted video before it freezes at initialTime. The underlying postMessage
  // state arrives at ~250ms cadence, so polling faster than that is wasteful.
  const hasCuedRef = useRef(false);
  useEffect(() => {
    hasCuedRef.current = false;
  }, [fileUrl]);
  useEffect(() => {
    if (!youtubeApi.isSubscribed) return;
    if (mediaType !== "youtube" || initialPlaying !== false) return;
    if (hasCuedRef.current) return;

    const stateRef = youtubeApi.stateRef;
    const { pause, seek } = youtubeApi;
    const watchdog = setInterval(() => {
      if (hasCuedRef.current) {
        clearInterval(watchdog);
        return;
      }
      if (stateRef.current.isPlaying) {
        pause();
        if (initialTime !== undefined && initialTime > 0) {
          seek(initialTime);
        }
        hasCuedRef.current = true;
        clearInterval(watchdog);
      }
    }, 100);

    // Give up after 2 s if autoplay is blocked or the player never reports playing.
    const safety = setTimeout(() => {
      clearInterval(watchdog);
      hasCuedRef.current = true;
    }, 2000);

    return () => {
      clearInterval(watchdog);
      clearTimeout(safety);
    };
  }, [youtubeApi, mediaType, initialPlaying, initialTime]);

  return {
    playbackState,
    setPlaybackState,
    videoRef,
    youtubeRef,
    youtubeStateRef,
    getCurrentTime,
    seekToTime,
    youtubePlayerReady,
    setYoutubePlayerReady,
    handleYouTubeIframeLoad: youtubeApi.handleIframeLoad,
  };
}

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
  const { channelName, send, isActive, mediaType } = options;

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

    const interval = setInterval(() => {
      if (videoRef.current) {
        const currentTime = videoRef.current.currentTime || 0;
        const duration = videoRef.current.duration || 0;
        const isPlaying = !videoRef.current.paused;
        const isMuted = videoRef.current.muted;

        // Update local state
        setPlaybackState({ currentTime, duration, isPlaying, isMuted });

        // Only send state to backend if video is ready (has duration)
        // This prevents sending currentTime: 0 before the video loads and seeks to startTime
        if (duration > 0) {
          send({
            type: "state",
            channel: channelName,
            data: { currentTime, duration, isPlaying, isMuted },
          });
        }
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

    // Send initial state immediately
    const currentYouTubeState = youtubeStateRef.current;
    setPlaybackState({ ...currentYouTubeState });
    send({
      type: "state",
      channel: channelName,
      data: currentYouTubeState,
    });

    // Send state updates periodically for YouTube
    const stateInterval = setInterval(() => {
      setPlaybackState({ ...youtubeStateRef.current });

      send({
        type: "state",
        channel: channelName,
        data: youtubeStateRef.current,
      });
    }, 1000);

    return () => {
      clearInterval(stateInterval);
    };
  }, [isActive, mediaType, send, channelName, youtubeStateRef]);

  // Track YouTube readiness from the shared hook
  useEffect(() => {
    if (youtubeApi.isSubscribed) {
      setYoutubePlayerReady(true);
    }
  }, [youtubeApi.isSubscribed]);

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

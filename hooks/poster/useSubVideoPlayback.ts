"use client";

import { useEffect, useState, useCallback } from "react";
import { EndBehavior } from "@/lib/models/Poster";

/**
 * Configuration for sub-video segment playback
 */
export interface SubVideoConfig {
  startTime: number;
  endTime?: number;
  endBehavior: EndBehavior;
}

/**
 * Options for the useSubVideoPlayback hook
 */
export interface UseSubVideoPlaybackOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  youtubeRef: React.RefObject<HTMLIFrameElement | null>;
  youtubeStateRef: React.MutableRefObject<{
    currentTime: number;
    duration: number;
    isPlaying: boolean;
    isMuted: boolean;
  }>;
  getCurrentTime: () => number;
  seekToTime: (time: number) => void;
  setPlaybackState: React.Dispatch<
    React.SetStateAction<{
      isPlaying: boolean;
      isMuted: boolean;
      currentTime: number;
      duration: number;
    }>
  >;
  isActive: boolean;
}

/**
 * Return type for the useSubVideoPlayback hook
 */
export interface UseSubVideoPlaybackReturn {
  subVideoConfig: SubVideoConfig | null;
  setSubVideoConfig: (config: SubVideoConfig | null) => void;
}

/**
 * Hook for managing sub-video segment playback
 *
 * This hook handles:
 * - Initial seek to startTime when a sub-video is activated
 * - Monitoring playback time and enforcing endTime boundaries
 * - Loop or stop behavior when endTime is reached
 *
 * @param options - Configuration options including video refs and callbacks
 * @returns Object containing subVideoConfig state and setter
 */
export function useSubVideoPlayback(
  options: UseSubVideoPlaybackOptions
): UseSubVideoPlaybackReturn {
  const {
    videoRef,
    youtubeRef,
    youtubeStateRef,
    getCurrentTime,
    seekToTime,
    setPlaybackState,
    isActive,
  } = options;

  const [subVideoConfig, setSubVideoConfig] = useState<SubVideoConfig | null>(
    null
  );

  // Monitor playback time for sub-video end behavior
  useEffect(() => {
    if (!subVideoConfig || !subVideoConfig.endTime || !isActive) return;

    const { startTime, endTime, endBehavior } = subVideoConfig;

    const checkEndTime = () => {
      const currentTime = getCurrentTime();

      if (currentTime >= endTime) {
        if (endBehavior === "loop") {
          // Loop back to start time
          seekToTime(startTime);
        } else {
          // Stop behavior: pause the video
          if (videoRef.current) {
            videoRef.current.pause();
          }
          if (youtubeRef.current) {
            youtubeRef.current.contentWindow?.postMessage(
              '{"event":"command","func":"pauseVideo","args":""}',
              "*"
            );
            youtubeStateRef.current.isPlaying = false;
          }
          setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
        }
      }
    };

    // Check every 100ms for precise end time detection
    const interval = setInterval(checkEndTime, 100);
    return () => clearInterval(interval);
  }, [
    subVideoConfig,
    isActive,
    getCurrentTime,
    seekToTime,
    videoRef,
    youtubeRef,
    youtubeStateRef,
    setPlaybackState,
  ]);

  // Memoize the setter to maintain referential stability
  const handleSetSubVideoConfig = useCallback(
    (config: SubVideoConfig | null) => {
      setSubVideoConfig(config);
    },
    []
  );

  return {
    subVideoConfig,
    setSubVideoConfig: handleSetSubVideoConfig,
  };
}

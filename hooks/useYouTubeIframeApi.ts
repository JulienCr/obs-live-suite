"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/**
 * State tracked from YouTube iframe postMessage events
 */
export interface YouTubeIframeState {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  isMuted: boolean;
}

interface UseYouTubeIframeApiOptions {
  /** Ref to the YouTube iframe element */
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  /** Unique listener ID for the postMessage subscription */
  listenerId: string;
  /** Whether the hook is active (should listen for messages) */
  enabled: boolean;
  /** Interval for syncing ref state to React state (ms) */
  pollingInterval?: number;
}

interface UseYouTubeIframeApiReturn {
  /** Current YouTube playback state (React state, updated at pollingInterval) */
  state: YouTubeIframeState;
  /** Mutable ref to YouTube state (updated in real-time from postMessage) */
  stateRef: React.MutableRefObject<YouTubeIframeState>;
  /** Whether the subscription to YouTube events is active */
  isSubscribed: boolean;
  /** Seek to a specific time */
  seek: (time: number) => void;
  /** Play the video */
  play: () => void;
  /** Pause the video */
  pause: () => void;
  /** Stop the video */
  stop: () => void;
  /** Mute the video */
  mute: () => void;
  /** Unmute the video */
  unmute: () => void;
  /** Call this when the iframe fires onLoad */
  handleIframeLoad: () => void;
  /** Reset state to defaults */
  resetState: () => void;
}

const DEFAULT_STATE: YouTubeIframeState = {
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  isMuted: true,
};

/**
 * Shared hook for YouTube iframe postMessage API communication.
 *
 * Handles subscription (with triple-retry on load + polling fallback),
 * receiving infoDelivery/onReady events, and sending commands.
 */
export function useYouTubeIframeApi(
  options: UseYouTubeIframeApiOptions
): UseYouTubeIframeApiReturn {
  const { iframeRef, listenerId, enabled, pollingInterval = 500 } = options;

  const [state, setState] = useState<YouTubeIframeState>({ ...DEFAULT_STATE });
  const stateRef = useRef<YouTubeIframeState>({ ...DEFAULT_STATE });
  const isSubscribedRef = useRef(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // --- postMessage helpers ---

  const YOUTUBE_ORIGIN = "https://www.youtube.com";

  const sendCommand = useCallback(
    (func: string, args: unknown = "") => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args }),
        YOUTUBE_ORIGIN
      );
    },
    [iframeRef]
  );

  const sendListening = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) return;
    iframe.contentWindow.postMessage(
      JSON.stringify({ event: "listening", id: listenerId, channel: "widget" }),
      YOUTUBE_ORIGIN
    );
  }, [iframeRef, listenerId]);

  // --- Controls ---

  const seek = useCallback(
    (time: number) => {
      sendCommand("seekTo", [time, true]);
      stateRef.current.currentTime = time;
    },
    [sendCommand]
  );

  const play = useCallback(() => {
    sendCommand("playVideo");
    stateRef.current.isPlaying = true;
  }, [sendCommand]);

  const pause = useCallback(() => {
    sendCommand("pauseVideo");
    stateRef.current.isPlaying = false;
  }, [sendCommand]);

  const stop = useCallback(() => {
    sendCommand("stopVideo");
    stateRef.current.isPlaying = false;
  }, [sendCommand]);

  const mute = useCallback(() => {
    sendCommand("mute");
    stateRef.current.isMuted = true;
  }, [sendCommand]);

  const unmute = useCallback(() => {
    sendCommand("unMute");
    stateRef.current.isMuted = false;
  }, [sendCommand]);

  const resetState = useCallback(() => {
    stateRef.current = { ...DEFAULT_STATE };
    setState({ ...DEFAULT_STATE });
    isSubscribedRef.current = false;
    setIsSubscribed(false);
  }, []);

  // --- iframe onLoad handler with triple-retry ---

  const iframeLoadTimeoutsRef = useRef<NodeJS.Timeout[]>([]);

  const handleIframeLoad = useCallback(() => {
    // Clear any pending retry timeouts from a previous load
    for (const t of iframeLoadTimeoutsRef.current) {
      clearTimeout(t);
    }
    iframeLoadTimeoutsRef.current = [];

    isSubscribedRef.current = false;
    setIsSubscribed(false);
    // Triple retry: 0ms, 500ms, 1500ms
    sendListening();
    iframeLoadTimeoutsRef.current.push(setTimeout(sendListening, 500));
    iframeLoadTimeoutsRef.current.push(setTimeout(sendListening, 1500));
  }, [sendListening]);

  // --- postMessage listener + polling ---

  useEffect(() => {
    if (!enabled) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;
      if (typeof event.data !== "string") return;
      try {
        const data = JSON.parse(event.data);

        if (data.event === "onReady") {
          sendListening();
        } else if (data.event === "infoDelivery" && data.info) {
          if (!isSubscribedRef.current) {
            isSubscribedRef.current = true;
            setIsSubscribed(true);
          }

          if (data.info.currentTime !== undefined) {
            stateRef.current.currentTime = data.info.currentTime;
          }
          if (data.info.duration !== undefined && data.info.duration > 0) {
            stateRef.current.duration = data.info.duration;
          }
          if (data.info.playerState !== undefined) {
            stateRef.current.isPlaying = data.info.playerState === 1;
          }
          if (data.info.muted !== undefined) {
            stateRef.current.isMuted = data.info.muted;
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    // Polling: sync ref → React state, and retry subscription if needed
    const interval = setInterval(() => {
      setState({ ...stateRef.current });

      // Keep retrying subscription if we haven't received any data yet
      if (!isSubscribedRef.current) {
        sendListening();
      }
    }, pollingInterval);

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      clearInterval(interval);
      // Clear any pending handleIframeLoad retry timeouts
      for (const t of iframeLoadTimeoutsRef.current) {
        clearTimeout(t);
      }
      iframeLoadTimeoutsRef.current = [];
    };
  }, [enabled, pollingInterval, sendListening]);

  return {
    state,
    stateRef,
    isSubscribed,
    seek,
    play,
    pause,
    stop,
    mute,
    unmute,
    handleIframeLoad,
    resetState,
  };
}

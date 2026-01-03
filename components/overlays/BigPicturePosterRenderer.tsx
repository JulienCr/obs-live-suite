"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { PosterShowPayload } from "@/lib/models/OverlayEvents";
import { PosterDisplay } from "./PosterDisplay";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import "./bigpicture-poster.css";

interface PosterData {
  fileUrl: string;
  type: "image" | "video" | "youtube";
  aspectRatio?: number;
}

interface BigPicturePosterState {
  visible: boolean;
  hiding: boolean;
  current: PosterData | null;
  previous: PosterData | null;
  transition: "fade" | "slide" | "cut" | "blur";
}

interface BigPicturePosterEvent {
  type: string;
  payload?: PosterShowPayload & { time?: number };
  id: string;
}

/**
 * BigPicturePosterRenderer displays posters in full-screen centered mode
 */
export function BigPicturePosterRenderer() {
  const [state, setState] = useState<BigPicturePosterState>({
    visible: false,
    hiding: false,
    current: null,
    previous: null,
    transition: "fade",
  });

  const [playbackState, setPlaybackState] = useState({
    isPlaying: false,
    isMuted: true,
    currentTime: 0,
    duration: 0,
  });

  const youtubeStateRef = useRef({
    currentTime: 0,
    duration: 900,
    isPlaying: true,
    isMuted: true,
  });

  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const fadeOutTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const crossFadeTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const youtubeRef = useRef<HTMLIFrameElement | null>(null);

  // Store sendAck in a ref to avoid stale closure in handleEvent
  const sendAckRef = useRef<(eventId: string, success?: boolean) => void>(() => {});
  const sendRef = useRef<(data: unknown) => void>(() => {});

  const handleEvent = useCallback(
    (data: {
      type: string;
      payload?: PosterShowPayload;
      id: string;
    }) => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
      if (fadeOutTimeout.current) {
        clearTimeout(fadeOutTimeout.current);
      }
      if (crossFadeTimeout.current) {
        clearTimeout(crossFadeTimeout.current);
      }

      switch (data.type) {
        case "show":
          if (data.payload) {
            // Use type from payload or fallback to extension detection
            const mediaType: "image" | "video" | "youtube" =
              data.payload.type ||
              (data.payload.fileUrl.endsWith(".mp4") ||
                data.payload.fileUrl.endsWith(".webm") ||
                data.payload.fileUrl.endsWith(".mov")
                ? "video"
                : "image");

            const newPoster: PosterData = {
              fileUrl: data.payload!.fileUrl,
              type: mediaType,
              aspectRatio: 1, // Aspect ratio is not used in "center" positioning mode
            };

            setState((prev) => {
              // Cross-fade: move current to previous if there's a current poster
              if (prev.visible && prev.current) {
                // Clear previous after cross-fade completes
                crossFadeTimeout.current = setTimeout(() => {
                  setState((s) => ({ ...s, previous: null }));
                }, 500); // Match fade duration

                return {
                  visible: true,
                  hiding: false,
                  current: newPoster,
                  previous: prev.current,
                  transition: data.payload!.transition || "fade",
                };
              }

              // No current poster, just show the new one
              return {
                visible: true,
                hiding: false,
                current: newPoster,
                previous: null,
                transition: data.payload!.transition || "fade",
              };
            });

            if (data.payload!.duration) {
              hideTimeout.current = setTimeout(() => {
                // Start fade out animation
                setState((prev) => ({ ...prev, hiding: true }));
                // After fade completes, fully hide
                fadeOutTimeout.current = setTimeout(() => {
                  setState((prev) => ({
                    ...prev,
                    visible: false,
                    hiding: false,
                    current: null,
                    previous: null,
                  }));
                }, 500); // Match fade duration
              }, data.payload!.duration * 1000);
            }
          }
          break;
        case "hide":
          // Stop video/YouTube before hiding
          if (videoRef.current) {
            videoRef.current.pause();
            videoRef.current.currentTime = 0;
          }
          if (youtubeRef.current) {
            youtubeRef.current.contentWindow?.postMessage(
              '{"event":"command","func":"stopVideo","args":""}',
              "*"
            );
          }

          // Reset YouTube state
          youtubeStateRef.current = {
            currentTime: 0,
            duration: 900,
            isPlaying: false,
            isMuted: true,
          };

          // Start fade out animation
          setState((prev) => ({ ...prev, hiding: true }));
          // After fade completes, fully hide and clean up
          fadeOutTimeout.current = setTimeout(() => {
            setState((prev) => ({
              ...prev,
              visible: false,
              hiding: false,
              current: null,
              previous: null,
            }));

            // Clean up refs
            if (videoRef.current) {
              videoRef.current.src = "";
              videoRef.current.load();
            }
          }, 500); // Match fade duration
          break;
        case "play":
          if (videoRef.current) {
            videoRef.current.play();
          }
          if (youtubeRef.current) {
            youtubeRef.current.contentWindow?.postMessage(
              '{"event":"command","func":"playVideo","args":""}',
              "*"
            );
            youtubeStateRef.current.isPlaying = true;
          }
          setPlaybackState((prev) => ({ ...prev, isPlaying: true }));
          break;
        case "pause":
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
          break;
        case "seek":
          const seekTime = (data.payload as any)?.time || 0;
          if (videoRef.current) {
            videoRef.current.currentTime = seekTime;
          }
          if (youtubeRef.current) {
            youtubeRef.current.contentWindow?.postMessage(
              `{"event":"command","func":"seekTo","args":[${seekTime}, true]}`,
              "*"
            );
            youtubeStateRef.current.currentTime = seekTime;
          }
          setPlaybackState((prev) => ({ ...prev, currentTime: seekTime }));
          break;
        case "mute":
          if (videoRef.current) {
            videoRef.current.muted = true;
          }
          if (youtubeRef.current) {
            youtubeRef.current.contentWindow?.postMessage(
              '{"event":"command","func":"mute","args":""}',
              "*"
            );
            youtubeStateRef.current.isMuted = true;
          }
          setPlaybackState((prev) => ({ ...prev, isMuted: true }));
          break;
        case "unmute":
          if (videoRef.current) {
            videoRef.current.muted = false;
          }
          if (youtubeRef.current) {
            youtubeRef.current.contentWindow?.postMessage(
              '{"event":"command","func":"unMute","args":""}',
              "*"
            );
            youtubeStateRef.current.isMuted = false;
          }
          setPlaybackState((prev) => ({ ...prev, isMuted: false }));
          break;
      }

      // Send acknowledgment
      sendAckRef.current(data.id, true);
    },
    []
  );

  // Use the WebSocket channel hook
  const { send, sendAck } = useWebSocketChannel<BigPicturePosterEvent>(
    "poster-bigpicture",
    handleEvent,
    { logPrefix: "BigPicturePoster" }
  );

  // Keep refs updated for use in callbacks
  useEffect(() => {
    sendAckRef.current = sendAck;
    sendRef.current = send;
  }, [send, sendAck]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }
      if (fadeOutTimeout.current) {
        clearTimeout(fadeOutTimeout.current);
      }
      if (crossFadeTimeout.current) {
        clearTimeout(crossFadeTimeout.current);
      }
    };
  }, []);

  // Send playback state updates for video/youtube
  useEffect(() => {
    if (
      !state.current ||
      (state.current.type !== "video" && state.current.type !== "youtube")
    ) {
      return;
    }

    const interval = setInterval(() => {
      if (state.current?.type === "video" && videoRef.current) {
        // For local videos, use standard HTML5 video API
        const currentTime = videoRef.current.currentTime || 0;
        const duration = videoRef.current.duration || 0;
        const isPlaying = !videoRef.current.paused;
        const isMuted = videoRef.current.muted;

        // Update state and send to backend
        setPlaybackState({ currentTime, duration, isPlaying, isMuted });

        sendRef.current({
          type: "state",
          channel: "poster-bigpicture",
          data: { currentTime, duration, isPlaying, isMuted },
        });
      }
      // For YouTube, state will be updated by message listener
    }, 1000);

    return () => clearInterval(interval);
  }, [state.current]);

  // Listen to YouTube player messages and send state updates
  useEffect(() => {
    if (!state.current || state.current.type !== "youtube") {
      return;
    }

    // Initialize from ref or defaults
    const currentYouTubeState = youtubeStateRef.current;

    // Send initial state immediately
    setPlaybackState(currentYouTubeState);
    sendRef.current({
      type: "state",
      channel: "poster-bigpicture",
      data: currentYouTubeState,
    });

    const handleYouTubeMessage = (event: MessageEvent) => {
      // Only process messages from YouTube
      if (typeof event.data !== "string") return;

      try {
        const data = JSON.parse(event.data);

        if (data.event === "onReady") {
          // Subscribe to state changes
          if (youtubeRef.current) {
            youtubeRef.current.contentWindow?.postMessage(
              '{"event":"listening","id":"bigpicture-poster-overlay","channel":"widget"}',
              "*"
            );
          }
        } else if (data.event === "infoDelivery" && data.info) {
          const info = data.info;

          // Update ref with real YouTube data
          if (info.currentTime !== undefined)
            youtubeStateRef.current.currentTime = info.currentTime;
          if (info.duration !== undefined)
            youtubeStateRef.current.duration = info.duration;
          if (info.playerState !== undefined)
            youtubeStateRef.current.isPlaying = info.playerState === 1;
          if (info.muted !== undefined)
            youtubeStateRef.current.isMuted = info.muted;
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };

    // Send state updates periodically
    const stateInterval = setInterval(() => {
      // Increment local time if playing
      if (youtubeStateRef.current.isPlaying) {
        youtubeStateRef.current.currentTime += 1;
      }

      setPlaybackState({ ...youtubeStateRef.current });

      sendRef.current({
        type: "state",
        channel: "poster-bigpicture",
        data: youtubeStateRef.current,
      });
    }, 1000);

    window.addEventListener("message", handleYouTubeMessage);

    return () => {
      window.removeEventListener("message", handleYouTubeMessage);
      clearInterval(stateInterval);
    };
  }, [state.current]);

  if (!state.visible && !state.hiding) {
    return null;
  }

  const renderPoster = (posterData: PosterData, className: string) => {
    return (
      <div key={posterData.fileUrl} className={className}>
        <PosterDisplay
          fileUrl={posterData.fileUrl}
          type={posterData.type}
          aspectRatio={posterData.aspectRatio || 1}
          positioning="center"
          videoRef={posterData.type === "video" ? videoRef : undefined}
          youtubeRef={posterData.type === "youtube" ? youtubeRef : undefined}
        />
      </div>
    );
  };

  return (
    <div
      className={`bigpicture-poster-container ${state.hiding ? "bigpicture-poster-hiding" : ""}`}
    >
      {/* Previous poster fading out */}
      {state.previous &&
        renderPoster(state.previous, "bigpicture-poster-layer bigpicture-poster-crossfade-out")}

      {/* Current poster */}
      {state.current &&
        renderPoster(
          state.current,
          `bigpicture-poster-layer bigpicture-poster-transition-${state.transition} ${state.previous ? "bigpicture-poster-crossfade-in" : ""}`
        )}
    </div>
  );
}

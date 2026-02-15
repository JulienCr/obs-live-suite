"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { AnimatePresence, m } from "framer-motion";
import { PosterShowPayload, ChapterJumpPayload } from "@/lib/models/OverlayEvents";
import { PosterDisplay } from "./PosterDisplay";
import { OverlayMotionProvider } from "./OverlayMotionProvider";
import { useWebSocketChannel } from "@/hooks/useWebSocketChannel";
import {
  usePosterPlayback,
  useChapterNavigation,
  useSubVideoPlayback,
} from "@/hooks/poster";
import { bigPictureTransitionVariants } from "./posterTransitionVariants";
import "./bigpicture-poster.css";

interface PosterData {
  fileUrl: string;
  type: "image" | "video" | "youtube";
  aspectRatio?: number;
  initialTime?: number; // Initial seek position for sub-video clips
  showId: string; // Unique ID to force React remount on each show
  subVideoConfig?: {
    startTime?: number;
    endTime?: number;
    endBehavior?: "stop" | "loop";
  };
}

interface BigPicturePosterState {
  visible: boolean;
  current: PosterData | null;
  transition: "fade" | "slide" | "cut" | "blur";
}

interface BigPicturePosterEvent {
  type: string;
  payload?: PosterShowPayload & { time?: number } & ChapterJumpPayload;
  id: string;
}

/**
 * BigPicturePosterRenderer displays posters in full-screen centered mode
 */
export function BigPicturePosterRenderer() {
  const [state, setState] = useState<BigPicturePosterState>({
    visible: false,
    current: null,
    transition: "fade",
  });

  // Refs for WebSocket callbacks and timeouts
  const sendAckRef = useRef<(eventId: string, success?: boolean) => void>(() => {});
  const sendRef = useRef<(data: unknown) => void>(() => {});
  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const cleanupTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  // Memoized send function to prevent effect re-runs
  const memoizedSend = useCallback((data: unknown) => sendRef.current(data), []);

  // Playback hook - channelName is "poster-bigpicture"
  const playback = usePosterPlayback({
    channelName: "poster-bigpicture",
    send: memoizedSend,
    isActive: state.current !== null,
    mediaType: state.current?.type || null,
  });

  // Chapter navigation hook
  const chapters = useChapterNavigation({
    getCurrentTime: playback.getCurrentTime,
    seekToTime: playback.seekToTime,
  });

  // Sub-video playback hook
  const subVideo = useSubVideoPlayback({
    videoRef: playback.videoRef,
    youtubeRef: playback.youtubeRef,
    youtubeStateRef: playback.youtubeStateRef,
    getCurrentTime: playback.getCurrentTime,
    seekToTime: playback.seekToTime,
    setPlaybackState: playback.setPlaybackState,
    isActive: state.current !== null,
  });

  const handleEvent = useCallback(
    (data: {
      type: string;
      payload?: PosterShowPayload;
      id: string;
    }) => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
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

            // Store sub-video configuration if provided
            if (data.payload.startTime !== undefined) {
              subVideo.setSubVideoConfig({
                startTime: data.payload.startTime,
                endTime: data.payload.endTime,
                endBehavior: data.payload.endBehavior || "stop",
              });
            } else {
              subVideo.setSubVideoConfig(null);
            }

            // Store chapters if provided
            chapters.setChapters(data.payload.chapters || []);

            const newPoster: PosterData = {
              fileUrl: data.payload!.fileUrl,
              type: mediaType,
              aspectRatio: 1, // Aspect ratio is not used in "center" positioning mode
              initialTime: data.payload.startTime, // Pass directly to avoid race condition with hook state
              showId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, // Unique ID to force React remount
              subVideoConfig: data.payload!.startTime !== undefined ? {
                startTime: data.payload!.startTime,
                endTime: data.payload!.endTime,
                endBehavior: data.payload!.endBehavior || "stop",
              } : undefined,
            };

            setState({
              visible: true,
              current: newPoster,
              transition: data.payload!.transition || "fade",
            });

            // Seek to startTime after video loads (robust approach)
            if (data.payload.startTime !== undefined && data.payload.startTime > 0) {
              const targetTime = data.payload.startTime;
              const seekToStart = () => {
                const video = playback.videoRef.current;
                if (video && video.readyState >= 1) {
                  video.currentTime = targetTime;
                } else {
                  // Retry if video not ready yet
                  setTimeout(seekToStart, 100);
                }
              };
              // Start trying after a short delay to allow video to mount
              setTimeout(seekToStart, 50);
            }

            if (data.payload!.duration) {
              hideTimeout.current = setTimeout(() => {
                // Set visible to false; AnimatePresence handles the exit animation
                setState((prev) => ({ ...prev, visible: false, current: null }));
              }, data.payload!.duration * 1000);
            }
          }
          break;
        case "hide":
          // Stop video/YouTube before hiding
          if (playback.videoRef.current) {
            playback.videoRef.current.pause();
            playback.videoRef.current.currentTime = 0;
          }
          if (playback.youtubeRef.current) {
            playback.youtubeRef.current.contentWindow?.postMessage(
              '{"event":"command","func":"stopVideo","args":""}',
              "*"
            );
          }

          // Reset YouTube state
          playback.youtubeStateRef.current = {
            currentTime: 0,
            duration: 900,
            isPlaying: false,
            isMuted: true,
          };

          // Set visible to false; AnimatePresence handles the exit animation
          setState((prev) => ({ ...prev, visible: false, current: null }));

          // Clean up refs after exit animation completes
          cleanupTimeout.current = setTimeout(() => {
            if (playback.videoRef.current) {
              playback.videoRef.current.src = "";
              playback.videoRef.current.load();
            }
          }, 600);
          break;
        case "play":
          if (playback.videoRef.current) {
            playback.videoRef.current.play();
          }
          if (playback.youtubeRef.current) {
            playback.youtubeRef.current.contentWindow?.postMessage(
              '{"event":"command","func":"playVideo","args":""}',
              "*"
            );
            playback.youtubeStateRef.current.isPlaying = true;
          }
          playback.setPlaybackState((prev) => ({ ...prev, isPlaying: true }));
          break;
        case "pause":
          if (playback.videoRef.current) {
            playback.videoRef.current.pause();
          }
          if (playback.youtubeRef.current) {
            playback.youtubeRef.current.contentWindow?.postMessage(
              '{"event":"command","func":"pauseVideo","args":""}',
              "*"
            );
            playback.youtubeStateRef.current.isPlaying = false;
          }
          playback.setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
          break;
        case "seek":
          const seekTime = (data.payload as unknown as { time?: number })?.time || 0;
          if (playback.videoRef.current) {
            playback.videoRef.current.currentTime = seekTime;
          }
          if (playback.youtubeRef.current) {
            playback.youtubeRef.current.contentWindow?.postMessage(
              `{"event":"command","func":"seekTo","args":[${seekTime}, true]}`,
              "*"
            );
            playback.youtubeStateRef.current.currentTime = seekTime;
          }
          playback.setPlaybackState((prev) => ({ ...prev, currentTime: seekTime }));
          break;
        case "mute":
          if (playback.videoRef.current) {
            playback.videoRef.current.muted = true;
          }
          if (playback.youtubeRef.current) {
            playback.youtubeRef.current.contentWindow?.postMessage(
              '{"event":"command","func":"mute","args":""}',
              "*"
            );
            playback.youtubeStateRef.current.isMuted = true;
          }
          playback.setPlaybackState((prev) => ({ ...prev, isMuted: true }));
          break;
        case "unmute":
          if (playback.videoRef.current) {
            playback.videoRef.current.muted = false;
          }
          if (playback.youtubeRef.current) {
            playback.youtubeRef.current.contentWindow?.postMessage(
              '{"event":"command","func":"unMute","args":""}',
              "*"
            );
            playback.youtubeStateRef.current.isMuted = false;
          }
          playback.setPlaybackState((prev) => ({ ...prev, isMuted: false }));
          break;
        case "chapter-next":
          chapters.navigateToNextChapter();
          break;
        case "chapter-previous":
          chapters.navigateToPreviousChapter();
          break;
        case "chapter-jump":
          if (data.payload && ('chapterIndex' in data.payload || 'chapterId' in data.payload)) {
            chapters.jumpToChapter(data.payload as ChapterJumpPayload);
          }
          break;
      }

      // Send acknowledgment
      sendAckRef.current(data.id, true);
    },
    [chapters, subVideo, playback]
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
      if (cleanupTimeout.current) {
        clearTimeout(cleanupTimeout.current);
      }
    };
  }, []);

  // Get the variants for the current transition type
  const variants = bigPictureTransitionVariants[state.transition] || bigPictureTransitionVariants.fade;

  return (
    <OverlayMotionProvider>
      <div className="bigpicture-poster-container">
        <AnimatePresence>
          {state.visible && state.current && (
            <m.div
              key={state.current.showId}
              className="bigpicture-poster-layer"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <PosterDisplay
                fileUrl={state.current.fileUrl}
                type={state.current.type}
                aspectRatio={state.current.aspectRatio || 1}
                positioning="center"
                videoRef={state.current.type === "video" ? playback.videoRef : undefined}
                youtubeRef={state.current.type === "youtube" ? playback.youtubeRef : undefined}
                initialTime={state.current.initialTime}
                videoKey={state.current.showId}
                subVideoConfig={state.current.subVideoConfig}
                onYouTubeIframeLoad={state.current.type === "youtube" ? playback.handleYouTubeIframeLoad : undefined}
              />
            </m.div>
          )}
        </AnimatePresence>
      </div>
    </OverlayMotionProvider>
  );
}

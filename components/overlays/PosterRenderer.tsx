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
import { posterTransitionVariants } from "./posterTransitionVariants";
import "./poster.css";

interface PosterEvent {
  type: string;
  payload?: PosterShowPayload & { time?: number } & ChapterJumpPayload;
  id: string;
}

interface PosterData {
  fileUrl: string;
  type: "image" | "video" | "youtube";
  offsetX?: number; // Horizontal offset from center (960px = center)
  aspectRatio?: number; // width/height ratio
  side: "left" | "right";
  initialTime?: number; // Initial seek position for sub-video clips
  showId: string; // Unique ID to force React remount on each show
  subVideoConfig?: {
    startTime?: number;
    endTime?: number;
    endBehavior?: "stop" | "loop";
  };
}

interface PosterState {
  visible: boolean;
  current: PosterData | null;
  transition: "fade" | "slide" | "cut" | "blur";
  side: "left" | "right";
}

/**
 * PosterRenderer displays poster/image overlays with cross-fade support
 */
export function PosterRenderer() {
  const [state, setState] = useState<PosterState>({
    visible: false,
    current: null,
    transition: "fade",
    side: "left",
  });

  // Store sendAck and send in refs to avoid circular dependency with handleEvent
  const sendAckRef = useRef<(eventId: string, success?: boolean) => void>(() => {});
  const sendRef = useRef<(data: unknown) => void>(() => {});

  // Timeout refs
  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const cleanupTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  // Memoized send function to prevent effect re-runs
  const memoizedSend = useCallback((data: unknown) => sendRef.current(data), []);

  // Playback hook - provides refs and controls
  const playback = usePosterPlayback({
    channelName: "poster",
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

  // Function to detect aspect ratio of media
  const detectAspectRatio = useCallback((fileUrl: string, type: "image" | "video" | "youtube"): Promise<number> => {
    return new Promise((resolve) => {
      if (type === "youtube") {
        // YouTube videos are always 16:9
        resolve(16 / 9);
      } else if (type === "video") {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          const aspectRatio = video.videoWidth / video.videoHeight;
          resolve(aspectRatio);
        };
        video.onerror = () => resolve(1); // Default to square if error
        video.src = fileUrl;
      } else {
        const img = new Image();
        img.onload = () => {
          const aspectRatio = img.naturalWidth / img.naturalHeight;
          resolve(aspectRatio);
        };
        img.onerror = () => resolve(1); // Default to square if error
        img.src = fileUrl;
      }
    });
  }, []);

  const handleEvent = useCallback((data: PosterEvent) => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }

    switch (data.type) {
      case "show":
        if (data.payload) {
          // Use type from payload or fallback to extension detection
          const mediaType: "image" | "video" | "youtube" = data.payload.type || (
            data.payload.fileUrl.endsWith(".mp4") ||
            data.payload.fileUrl.endsWith(".webm") ||
            data.payload.fileUrl.endsWith(".mov")
              ? "video"
              : "image"
          );

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

          // Capture startTime before async call to avoid race condition with hook state
          const capturedStartTime = data.payload.startTime;

          // Detect aspect ratio asynchronously
          detectAspectRatio(data.payload.fileUrl, mediaType).then((aspectRatio) => {
            const newPoster: PosterData = {
              fileUrl: data.payload!.fileUrl,
              type: mediaType,
              offsetX: data.payload!.theme?.layout?.x, // Extract horizontal offset from theme
              aspectRatio,
              side: data.payload!.side || "left",
              initialTime: capturedStartTime, // Pass directly to avoid race condition with hook state
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
              transition: data.payload!.transition,
              side: newPoster.side,
            });

            // Seek to startTime after video loads (robust approach)
            if (capturedStartTime !== undefined && capturedStartTime > 0) {
              const seekToStart = () => {
                const video = playback.videoRef.current;
                if (video && video.readyState >= 1) {
                  video.currentTime = capturedStartTime;
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
          });
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
            '*'
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
            playback.videoRef.current.src = '';
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
            '*'
          );
          playback.youtubeStateRef.current.isPlaying = true;
        }
        playback.setPlaybackState(prev => ({ ...prev, isPlaying: true }));
        break;
      case "pause":
        if (playback.videoRef.current) {
          playback.videoRef.current.pause();
        }
        if (playback.youtubeRef.current) {
          playback.youtubeRef.current.contentWindow?.postMessage(
            '{"event":"command","func":"pauseVideo","args":""}',
            '*'
          );
          playback.youtubeStateRef.current.isPlaying = false;
        }
        playback.setPlaybackState(prev => ({ ...prev, isPlaying: false }));
        break;
      case "seek": {
        const seekTime = data.payload?.time || 0;
        if (playback.videoRef.current) {
          playback.videoRef.current.currentTime = seekTime;
        }
        if (playback.youtubeRef.current) {
          playback.youtubeRef.current.contentWindow?.postMessage(
            `{"event":"command","func":"seekTo","args":[${seekTime}, true]}`,
            '*'
          );
          playback.youtubeStateRef.current.currentTime = seekTime;
        }
        playback.setPlaybackState(prev => ({ ...prev, currentTime: seekTime }));
        break;
      }
      case "mute":
        if (playback.videoRef.current) {
          playback.videoRef.current.muted = true;
        }
        if (playback.youtubeRef.current) {
          playback.youtubeRef.current.contentWindow?.postMessage(
            '{"event":"command","func":"mute","args":""}',
            '*'
          );
          playback.youtubeStateRef.current.isMuted = true;
        }
        playback.setPlaybackState(prev => ({ ...prev, isMuted: true }));
        break;
      case "unmute":
        if (playback.videoRef.current) {
          playback.videoRef.current.muted = false;
        }
        if (playback.youtubeRef.current) {
          playback.youtubeRef.current.contentWindow?.postMessage(
            '{"event":"command","func":"unMute","args":""}',
            '*'
          );
          playback.youtubeStateRef.current.isMuted = false;
        }
        playback.setPlaybackState(prev => ({ ...prev, isMuted: false }));
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

    // Send acknowledgment via ref
    sendAckRef.current(data.id);
  }, [detectAspectRatio, playback, chapters, subVideo]);

  // Use WebSocket channel hook
  const { send, sendAck } = useWebSocketChannel<PosterEvent>(
    "poster",
    handleEvent,
    { logPrefix: "Poster" }
  );

  // Keep sendAck and send refs updated
  useEffect(() => {
    sendAckRef.current = sendAck;
    sendRef.current = send;
  }, [send, sendAck]);

  // Cleanup timeouts on unmount
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
  const variants = posterTransitionVariants[state.transition] || posterTransitionVariants.fade;

  return (
    <OverlayMotionProvider>
      <div className="poster-container">
        <AnimatePresence>
          {state.visible && state.current && (
            <m.div
              key={state.current.showId}
              className="poster-layer"
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
            >
              <PosterDisplay
                fileUrl={state.current.fileUrl}
                type={state.current.type}
                aspectRatio={state.current.aspectRatio || 1}
                positioning="side"
                side={state.current.side}
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


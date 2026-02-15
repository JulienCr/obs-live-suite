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
  handlePosterHide,
  handlePosterPlaybackEvent,
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
  transition: "fade" | "slide" | "cut" | "blur-sm";
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

  const sendAckRef = useRef<(eventId: string, success?: boolean) => void>(() => {});
  const sendRef = useRef<(data: unknown) => void>(() => {});

  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const cleanupTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const memoizedSend = useCallback((data: unknown) => sendRef.current(data), []);

  const playback = usePosterPlayback({
    channelName: "poster",
    send: memoizedSend,
    isActive: state.current !== null,
    mediaType: state.current?.type || null,
  });

  const chapters = useChapterNavigation({
    getCurrentTime: playback.getCurrentTime,
    seekToTime: playback.seekToTime,
  });

  const subVideo = useSubVideoPlayback({
    videoRef: playback.videoRef,
    youtubeRef: playback.youtubeRef,
    youtubeStateRef: playback.youtubeStateRef,
    getCurrentTime: playback.getCurrentTime,
    seekToTime: playback.seekToTime,
    setPlaybackState: playback.setPlaybackState,
    isActive: state.current !== null,
  });

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
          const mediaType: "image" | "video" | "youtube" = data.payload.type || (
            data.payload.fileUrl.endsWith(".mp4") ||
            data.payload.fileUrl.endsWith(".webm") ||
            data.payload.fileUrl.endsWith(".mov")
              ? "video"
              : "image"
          );

          if (data.payload.startTime !== undefined) {
            subVideo.setSubVideoConfig({
              startTime: data.payload.startTime,
              endTime: data.payload.endTime,
              endBehavior: data.payload.endBehavior || "stop",
            });
          } else {
            subVideo.setSubVideoConfig(null);
          }

          chapters.setChapters(data.payload.chapters || []);

          const capturedStartTime = data.payload.startTime;

          detectAspectRatio(data.payload.fileUrl, mediaType).then((aspectRatio) => {
            const newPoster: PosterData = {
              fileUrl: data.payload!.fileUrl,
              type: mediaType,
              offsetX: data.payload!.theme?.layout?.x,
              aspectRatio,
              side: data.payload!.side || "left",
              initialTime: capturedStartTime,
              showId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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

            if (capturedStartTime !== undefined && capturedStartTime > 0) {
              const seekToStart = () => {
                const video = playback.videoRef.current;
                if (video && video.readyState >= 1) {
                  video.currentTime = capturedStartTime;
                } else {
                  setTimeout(seekToStart, 100);
                }
              };
              setTimeout(seekToStart, 50);
            }

            if (data.payload!.duration) {
              hideTimeout.current = setTimeout(() => {
                setState((prev) => ({ ...prev, visible: false, current: null }));
              }, data.payload!.duration * 1000);
            }
          });
        }
        break;
      case "hide":
        handlePosterHide(playback, setState, cleanupTimeout);
        break;
      default:
        handlePosterPlaybackEvent(data, playback, chapters);
        break;
    }

    sendAckRef.current(data.id);
  }, [detectAspectRatio, playback, chapters, subVideo]);

  const { send, sendAck } = useWebSocketChannel<PosterEvent>(
    "poster",
    handleEvent,
    { logPrefix: "Poster" }
  );

  sendAckRef.current = sendAck;
  sendRef.current = send;

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

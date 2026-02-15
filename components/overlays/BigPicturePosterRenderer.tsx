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

  const sendAckRef = useRef<(eventId: string, success?: boolean) => void>(() => {});
  const sendRef = useRef<(data: unknown) => void>(() => {});
  const hideTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const cleanupTimeout = useRef<NodeJS.Timeout | undefined>(undefined);

  const memoizedSend = useCallback((data: unknown) => sendRef.current(data), []);

  const playback = usePosterPlayback({
    channelName: "poster-bigpicture",
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

  const handleEvent = useCallback(
    (data: BigPicturePosterEvent) => {
      if (hideTimeout.current) {
        clearTimeout(hideTimeout.current);
      }

      switch (data.type) {
        case "show":
          if (data.payload) {
            const mediaType: "image" | "video" | "youtube" =
              data.payload.type ||
              (data.payload.fileUrl.endsWith(".mp4") ||
                data.payload.fileUrl.endsWith(".webm") ||
                data.payload.fileUrl.endsWith(".mov")
                ? "video"
                : "image");

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

            const newPoster: PosterData = {
              fileUrl: data.payload.fileUrl,
              type: mediaType,
              aspectRatio: 1,
              initialTime: data.payload.startTime,
              showId: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              subVideoConfig: data.payload.startTime !== undefined ? {
                startTime: data.payload.startTime,
                endTime: data.payload.endTime,
                endBehavior: data.payload.endBehavior || "stop",
              } : undefined,
            };

            setState({
              visible: true,
              current: newPoster,
              transition: data.payload.transition || "fade",
            });

            if (data.payload.startTime !== undefined && data.payload.startTime > 0) {
              const targetTime = data.payload.startTime;
              const seekToStart = () => {
                const video = playback.videoRef.current;
                if (video && video.readyState >= 1) {
                  video.currentTime = targetTime;
                } else {
                  setTimeout(seekToStart, 100);
                }
              };
              setTimeout(seekToStart, 50);
            }

            if (data.payload.duration) {
              hideTimeout.current = setTimeout(() => {
                setState((prev) => ({ ...prev, visible: false, current: null }));
              }, data.payload.duration * 1000);
            }
          }
          break;
        case "hide":
          handlePosterHide(playback, setState, cleanupTimeout);
          break;
        default:
          handlePosterPlaybackEvent(data, playback, chapters);
          break;
      }

      sendAckRef.current(data.id, true);
    },
    [chapters, subVideo, playback]
  );

  const { send, sendAck } = useWebSocketChannel<BigPicturePosterEvent>(
    "poster-bigpicture",
    handleEvent,
    { logPrefix: "BigPicturePoster" }
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

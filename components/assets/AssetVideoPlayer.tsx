"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { VideoTimeline } from "./VideoTimeline";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useYouTubeIframeApi } from "@/hooks/useYouTubeIframeApi";
import { extractYouTubeId } from "@/lib/utils/urlDetection";
import { buildYouTubeEmbedUrl } from "@/lib/utils/youtubeUrlBuilder";

interface VideoChapter {
  id: string;
  title: string;
  timestamp: number;
}

interface AssetVideoPlayerProps {
  fileUrl: string;
  type: "video" | "youtube";
  duration: number;
  chapters?: VideoChapter[];
  startTime?: number | null;
  endTime?: number | null;
  onChapterClick?: (chapter: VideoChapter) => void;
  onTimeUpdate?: (currentTime: number) => void;
  previewRange?: { start: number; end: number };
  highlightedChapterTime?: number;
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  inPointMarker?: number | null;
  outPointMarker?: number | null;
  className?: string;
}

export function AssetVideoPlayer({
  fileUrl,
  type,
  duration,
  chapters = [],
  startTime,
  endTime,
  onChapterClick,
  onTimeUpdate,
  previewRange,
  highlightedChapterTime,
  videoRef: externalVideoRef,
  inPointMarker,
  outPointMarker,
  className = "",
}: AssetVideoPlayerProps) {
  const t = useTranslations("assets.posters");
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = externalVideoRef ?? internalVideoRef;
  const [currentTime, setCurrentTime] = useState(startTime ?? 0);
  const [isPlaying, setIsPlaying] = useState(false);

  // Effective duration for clips
  const effectiveStart = startTime ?? 0;
  const effectiveEnd = endTime ?? duration;

  // YouTube iframe ref + shared hook
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const youtubeApi = useYouTubeIframeApi({
    iframeRef,
    listenerId: "asset-player",
    enabled: type === "youtube",
    pollingInterval: 500,
  });

  // Sync YouTube state to local state
  useEffect(() => {
    if (type !== "youtube") return;

    const interval = setInterval(() => {
      setCurrentTime(youtubeApi.stateRef.current.currentTime);
      onTimeUpdate?.(youtubeApi.stateRef.current.currentTime);
      setIsPlaying(youtubeApi.stateRef.current.isPlaying);
    }, 500);

    return () => clearInterval(interval);
  }, [type, onTimeUpdate]);

  // Update current time from video
  useEffect(() => {
    if (type === "youtube") return;
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
      // For clips, stop at endTime
      if (endTime && video.currentTime >= endTime) {
        video.pause();
        video.currentTime = effectiveStart;
        setIsPlaying(false);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    // Set initial position for clips
    if (effectiveStart > 0) {
      video.currentTime = effectiveStart;
    }

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, [type, effectiveStart, endTime, onTimeUpdate]);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      // Clamp to clip bounds
      const clampedTime = Math.max(effectiveStart, Math.min(time, effectiveEnd));
      videoRef.current.currentTime = clampedTime;
      setCurrentTime(clampedTime);
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleChapterClick = (chapter: VideoChapter) => {
    handleSeek(chapter.timestamp);
    onChapterClick?.(chapter);
  };

  const handleYouTubeSeek = useCallback((time: number) => {
    const clampedTime = Math.max(effectiveStart, Math.min(time, effectiveEnd));
    youtubeApi.seek(clampedTime);
    setCurrentTime(clampedTime);
  }, [effectiveStart, effectiveEnd, youtubeApi]);

  if (type === "youtube") {
    const videoId = extractYouTubeId(fileUrl);
    const youtubeUrl = buildYouTubeEmbedUrl({
      videoId: videoId || "",
      startTime: effectiveStart > 0 ? effectiveStart : undefined,
      autoplay: false,
      mute: false,
      controls: false,
      enablejsapi: true,
      origin: typeof window !== "undefined" ? window.location.origin : undefined,
    });

    return (
      <div className={className}>
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <iframe
            ref={iframeRef}
            src={youtubeUrl}
            title={t("videoPlayer")}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            onLoad={youtubeApi.handleIframeLoad}
          />
        </div>
        <div className="mt-4">
          <VideoTimeline
            duration={duration}
            chapters={chapters}
            currentTime={currentTime}
            onSeek={handleYouTubeSeek}
            onChapterClick={(chapter) => {
              handleYouTubeSeek(chapter.timestamp);
              onChapterClick?.(chapter);
            }}
            selectionRange={previewRange ?? (startTime != null && endTime != null ? { start: startTime, end: endTime } : undefined)}
            inPointMarker={inPointMarker}
            outPointMarker={outPointMarker}
            highlightedChapterTime={highlightedChapterTime}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="aspect-video bg-black rounded-lg overflow-hidden relative group">
        <video
          ref={videoRef}
          src={fileUrl}
          className="w-full h-full object-contain"
          preload="metadata"
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="secondary"
            size="lg"
            className="rounded-full w-16 h-16"
            onClick={handlePlayPause}
          >
            {isPlaying ? (
              <Pause className="h-8 w-8" />
            ) : (
              <Play className="h-8 w-8 ml-1" />
            )}
          </Button>
        </div>
      </div>
      <div className="mt-4">
        <VideoTimeline
          duration={duration}
          chapters={chapters}
          currentTime={currentTime}
          onSeek={handleSeek}
          onChapterClick={handleChapterClick}
          selectionRange={previewRange ?? (startTime != null && endTime != null ? { start: startTime, end: endTime } : undefined)}
          inPointMarker={inPointMarker}
          outPointMarker={outPointMarker}
          highlightedChapterTime={highlightedChapterTime}
        />
      </div>
    </div>
  );
}

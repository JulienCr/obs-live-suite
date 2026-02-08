"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { VideoTimeline } from "./VideoTimeline";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  const effectiveDuration = effectiveEnd - effectiveStart;

  // Update current time from video
  useEffect(() => {
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
  }, [effectiveStart, endTime, onTimeUpdate]);

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

  // Extract YouTube video ID
  const getYouTubeId = (url: string) => {
    const match = url.match(/(?:youtube\.com\/embed\/|youtu\.be\/)([^?&]+)/);
    return match?.[1];
  };

  if (type === "youtube") {
    const videoId = getYouTubeId(fileUrl);
    return (
      <div className={className}>
        <div className="aspect-video bg-black rounded-lg overflow-hidden">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}?start=${Math.floor(effectiveStart)}`}
            title={t("videoPlayer")}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
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

import React, { useEffect, useRef } from "react";
import { buildYouTubeEmbedUrl } from "@/lib/utils/youtubeUrlBuilder";
import { extractYouTubeId } from "@/lib/utils/urlDetection";

interface PosterDisplayProps {
  fileUrl: string;
  type: "image" | "video" | "youtube";
  aspectRatio: number;
  positioning: "side" | "center"; // side = left/right positioning, center = big-picture centered
  side?: "left" | "right"; // only used when positioning="side"
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  youtubeRef?: React.RefObject<HTMLIFrameElement | null>;
  initialTime?: number; // Initial seek position for video clips (sub-videos)
  videoKey?: string; // Unique key to force video element remount
  subVideoConfig?: {
    startTime?: number;
    endTime?: number;
    endBehavior?: "stop" | "loop";
  };
  onYouTubeIframeLoad?: () => void;
}

/**
 * PosterDisplay - Pure rendering component for posters
 * Supports images, videos, and YouTube embeds with different positioning modes
 */
export function PosterDisplay({
  fileUrl,
  type,
  aspectRatio,
  positioning,
  side = "left",
  videoRef,
  youtubeRef,
  initialTime,
  videoKey,
  subVideoConfig,
  onYouTubeIframeLoad,
}: PosterDisplayProps) {
  const isLeftSide = side === "left";
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const effectiveVideoRef = videoRef || localVideoRef;
  const seekAttemptedRef = useRef(false);

  // Backup seek mechanism: ensure video seeks to initialTime even if onLoadedMetadata doesn't fire
  useEffect(() => {
    if (type !== "video" || !initialTime || initialTime <= 0) {
      return;
    }

    seekAttemptedRef.current = false;

    const trySeek = () => {
      const video = effectiveVideoRef.current;
      if (!video || seekAttemptedRef.current) return;

      // Only seek if video has enough data and we haven't already seeked
      if (video.readyState >= 1) { // HAVE_METADATA or higher
        video.currentTime = initialTime;
        seekAttemptedRef.current = true;
      }
    };

    // Try immediately
    trySeek();

    // Also try after a short delay in case the video isn't ready yet
    const timeoutId = setTimeout(trySeek, 100);
    const timeoutId2 = setTimeout(trySeek, 500);

    // And listen for loadedmetadata as backup
    const video = effectiveVideoRef.current;
    if (video) {
      video.addEventListener("loadedmetadata", trySeek);
    }

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(timeoutId2);
      if (video) {
        video.removeEventListener("loadedmetadata", trySeek);
      }
    };
  }, [type, initialTime, effectiveVideoRef]);

  // YouTube has special positioning
  if (type === "youtube") {
    // Build YouTube embed URL with parameters
    const videoId = extractYouTubeId(fileUrl);
    if (!videoId) {
      console.error("Failed to extract YouTube video ID from:", fileUrl);
      // Fallback to original URL if extraction fails
      return null;
    }
    const youtubeUrl = buildYouTubeEmbedUrl({
      videoId,
      startTime: subVideoConfig?.startTime,
      endTime: subVideoConfig?.endTime,
      endBehavior: subVideoConfig?.endBehavior,
      autoplay: true,
      mute: true,
      controls: false,
    });

    const youtubeStyle: React.CSSProperties =
      positioning === "center"
        ? {
            // Big-picture mode: centered, full-screen
            position: 'absolute',
            objectFit: 'contain',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '100vw',
            height: '100vh',
            aspectRatio: '16 / 9',
            border: 'none',
            margin: 0,
            padding: 0,
          }
        : {
            // Side mode: positioned left or right, centered vertically
            position: 'absolute',
            objectFit: 'contain',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
            ...(isLeftSide
              ? {
                  left: '30px',
                  right: 'auto',
                }
              : {
                  left: 'auto',
                  right: '30px',
                }),
            top: '50%',
            transform: 'translate(0%, -50%)',
            width: '50%',
            aspectRatio: '16 / 9',
            border: 'none',
          };

    return (
      <iframe
        ref={youtubeRef}
        style={youtubeStyle}
        src={youtubeUrl}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        aria-label="Poster YouTube video"
        onLoad={onYouTubeIframeLoad}
      />
    );
  }

  // For images and videos
  const isLandscape = aspectRatio > 1.2;

  const mediaStyle: React.CSSProperties =
    positioning === "center"
      ? {
          // Big-picture mode: centered, full-screen with aspect ratio preserved
          position: 'absolute',
          objectFit: 'contain',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          borderRadius: '8px',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '100vw',
          height: '100vh',
          margin: 0,
          padding: 0,
        }
      : {
          // Side mode: different positioning based on aspect ratio and side
          position: 'absolute',
          objectFit: 'contain',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
          borderRadius: '8px',
          ...(isLandscape
            ? {
                // Landscape: bottom corner positioning
                ...(isLeftSide
                  ? {
                      left: '30px',
                      right: 'auto',
                    }
                  : {
                      left: 'auto',
                      right: '30px',
                    }),
                bottom: '30px',
                top: 'auto',
                transform: 'none',
                maxWidth: '35%',
                maxHeight: '40%',
              }
            : {
                // Portrait/Square: center side positioning
                ...(isLeftSide
                  ? {
                      left: '30px',
                      right: 'auto',
                    }
                  : {
                      left: 'auto',
                      right: '30px',
                    }),
                top: '50%',
                bottom: 'auto',
                transform: 'translate(0%, -50%)',
                maxWidth: '90%',
                maxHeight: '90%',
              }),
        };

  return type === "video" ? (
    <video
      key={videoKey || fileUrl}
      ref={effectiveVideoRef}
      style={mediaStyle}
      src={fileUrl}
      loop
      muted
      aria-label="Poster video"
      onCanPlay={(e) => {
        // This fires when the browser can start playing (most reliable for seek)
        const video = e.currentTarget;
        if (initialTime && initialTime > 0 && Math.abs(video.currentTime - initialTime) > 1) {
          video.currentTime = initialTime;
          // Verify after a short delay and retry if needed
          setTimeout(() => {
            if (Math.abs(video.currentTime - initialTime) > 1) {
              video.currentTime = initialTime;
            }
          }, 100);
        }
      }}
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img style={mediaStyle} src={fileUrl} alt="Poster" />
  );
}

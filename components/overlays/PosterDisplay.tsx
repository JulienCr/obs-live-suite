import React, { useRef } from "react";
import { buildYouTubeEmbedUrl } from "@/lib/utils/youtubeUrlBuilder";
import { extractYouTubeId } from "@/lib/utils/urlDetection";

interface PosterDisplayProps {
  fileUrl: string;
  type: "image" | "video" | "youtube";
  aspectRatio: number;
  positioning: "side" | "center"; // side = left/right positioning, center = big-picture centered
  side?: "left" | "right"; // only used when positioning="side"
  orientation?: "landscape" | "portrait"; // "portrait" = vertical 9:16 (YouTube Shorts)
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  youtubeRef?: React.RefObject<HTMLIFrameElement | null>;
  initialTime?: number; // Initial seek position (resumeFrom from cue, else sub-video clip start)
  initialPlaying?: boolean; // If false, start the media paused
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
  orientation = "landscape",
  videoRef,
  youtubeRef,
  initialTime,
  initialPlaying = true,
  videoKey,
  subVideoConfig,
  onYouTubeIframeLoad,
}: PosterDisplayProps) {
  const isLeftSide = side === "left";
  const isPortrait = orientation === "portrait";
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const effectiveVideoRef = videoRef || localVideoRef;

  // YouTube has special positioning
  if (type === "youtube") {
    // Build YouTube embed URL with parameters
    const videoId = extractYouTubeId(fileUrl);
    if (!videoId) {
      console.error("Failed to extract YouTube video ID from:", fileUrl);
      return (
        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", color: "#666" }}>
          <span>Invalid YouTube URL</span>
        </div>
      );
    }
    const youtubeUrl = buildYouTubeEmbedUrl({
      videoId,
      // initialTime (cue resumeFrom) overrides the sub-video clip start so the
      // player opens at the cued position.
      startTime: initialTime ?? subVideoConfig?.startTime,
      endTime: subVideoConfig?.endTime,
      endBehavior: subVideoConfig?.endBehavior,
      // Always autoplay=true so the player exits UNSTARTED and renders a frame
      // (otherwise YouTube shows the thumbnail-with-play-button). When
      // initialPlaying is false, usePosterPlayback pauses within a frame or
      // two via postMessage; the start URL param positions us at initialTime.
      autoplay: true,
      mute: true,
      controls: false,
    });

    const wrapperStyle: React.CSSProperties =
      positioning === "center"
        ? {
            // Big-picture mode: centered, full-screen
            position: 'absolute',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
            overflow: 'hidden',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            margin: 0,
            padding: 0,
            // Portrait (Shorts): drive off height and let width derive from the
            // 9:16 ratio so the vertical video fills the screen height, centered
            // as a pillar (no side letterboxing). Landscape fills the viewport 16:9.
            ...(isPortrait
              ? { height: '100vh', aspectRatio: '9 / 16' }
              : { width: '100vw', height: '100vh', aspectRatio: '16 / 9' }),
          }
        : {
            // Side mode: positioned left or right, centered vertically
            position: 'absolute',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
            borderRadius: '8px',
            overflow: 'hidden',
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
            // Portrait (Shorts): tall 9:16 pillar hugging the side; landscape keeps
            // the half-width 16:9 box.
            ...(isPortrait
              ? { height: '90%', aspectRatio: '9 / 16' }
              : { width: '50%', aspectRatio: '16 / 9' }),
          };

    return (
      <div style={wrapperStyle}>
        <iframe
          ref={youtubeRef}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
          src={youtubeUrl}
          title="YouTube video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          aria-label="Poster YouTube video"
          onLoad={onYouTubeIframeLoad}
        />
        {/* Mask the YouTube paused-state chrome (title bar, "More videos" / Watch
            later / Share buttons). No URL param suppresses these — costs ~7%
            of the top edge but eliminates the overlay across all embed variants. */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '7%',
            background: '#000',
            pointerEvents: 'none',
          }}
        />
      </div>
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
        if (!initialPlaying) {
          video.pause();
        }
      }}
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img style={mediaStyle} src={fileUrl} alt="Poster" />
  );
}

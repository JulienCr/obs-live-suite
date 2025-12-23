import React from "react";

interface PosterDisplayProps {
  fileUrl: string;
  type: "image" | "video" | "youtube";
  aspectRatio: number;
  positioning: "side" | "center"; // side = left/right positioning, center = big-picture centered
  side?: "left" | "right"; // only used when positioning="side"
  videoRef?: React.RefObject<HTMLVideoElement | null>;
  youtubeRef?: React.RefObject<HTMLIFrameElement | null>;
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
}: PosterDisplayProps) {
  const isLeftSide = side === "left";

  // YouTube has special positioning
  if (type === "youtube") {
    // Add YouTube parameters to force autoplay and hide UI
    const youtubeUrl = new URL(fileUrl);
    youtubeUrl.searchParams.set('autoplay', '1');
    youtubeUrl.searchParams.set('mute', '1');
    youtubeUrl.searchParams.set('controls', '0');
    youtubeUrl.searchParams.set('showinfo', '0');
    youtubeUrl.searchParams.set('rel', '0');
    youtubeUrl.searchParams.set('modestbranding', '1');
    youtubeUrl.searchParams.set('playsinline', '1');
    youtubeUrl.searchParams.set('loop', '1');
    youtubeUrl.searchParams.set('enablejsapi', '1');

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
        src={youtubeUrl.toString()}
        title="YouTube video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        aria-label="Poster YouTube video"
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
      ref={videoRef}
      style={mediaStyle}
      src={fileUrl}
      autoPlay
      loop
      muted
      aria-label="Poster video"
    />
  ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img style={mediaStyle} src={fileUrl} alt="Poster" />
  );
}

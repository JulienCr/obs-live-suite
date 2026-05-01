"use client";

import { useEffect, useRef } from "react";
import { buildYouTubeEmbedUrl } from "@/lib/utils/youtubeUrlBuilder";
import { extractYouTubeId } from "@/lib/utils/urlDetection";
import { useYouTubeIframeApi } from "@/hooks/useYouTubeIframeApi";
import type { ArmedVideoPoster } from "@/hooks/useArmedVideoPoster";

/** Drift threshold above which we re-seek the local player to the desired state. */
const MP4_SYNC_THRESHOLD_S = 0.4;
const YT_SYNC_THRESHOLD_S = 1.0;

interface PlayerProps {
  armed: ArmedVideoPoster;
  onTimeUpdate: (t: number) => void;
  onPlayingChange: (playing: boolean) => void;
  onDuration: (duration: number) => void;
}

/**
 * Mode-agnostic regie video preview. Always muted.
 *
 * Follows `currentTime` / `isPlaying` from the armed store: pre-live the
 * timeline drives them, post-live OBS state ticks drive them. Either way the
 * player just chases the props with a small drift threshold.
 *
 * `onTimeUpdate` / `onPlayingChange` are forwarded to the store; the store
 * ignores them while live (OBS is authoritative there).
 */
export function PosterPreviewPlayer({ armed, onTimeUpdate, onPlayingChange, onDuration }: PlayerProps) {
  if (armed.type === "video") {
    return (
      <ArmedVideoPlayer
        armed={armed}
        onTimeUpdate={onTimeUpdate}
        onPlayingChange={onPlayingChange}
        onDuration={onDuration}
      />
    );
  }
  return (
    <ArmedYouTubePlayer
      armed={armed}
      onTimeUpdate={onTimeUpdate}
      onPlayingChange={onPlayingChange}
      onDuration={onDuration}
    />
  );
}

function ArmedVideoPlayer({ armed, onTimeUpdate, onPlayingChange, onDuration }: PlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasInitSeekRef = useRef(false);
  const initialTimeRef = useRef(armed.currentTime);

  // Initial seek as soon as metadata is ready.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasInitSeekRef.current) return;
    if (video.readyState >= 1) {
      video.currentTime = initialTimeRef.current;
      hasInitSeekRef.current = true;
    }
  }, []);

  // Drive isPlaying.
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (armed.isPlaying && video.paused) {
      video.play().catch(() => {
        /* Autoplay blocked despite muted — ignore. */
      });
    } else if (!armed.isPlaying && !video.paused) {
      video.pause();
    }
  }, [armed.isPlaying]);

  // Drive currentTime: re-seek if the gap exceeds threshold (filters out the
  // natural feedback from onTimeUpdate → store → prop round-trip).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !hasInitSeekRef.current) return;
    if (Math.abs(video.currentTime - armed.currentTime) > MP4_SYNC_THRESHOLD_S) {
      video.currentTime = armed.currentTime;
    }
  }, [armed.currentTime]);

  return (
    <video
      ref={videoRef}
      src={armed.fileUrl}
      muted
      playsInline
      loop={armed.endBehavior === "loop"}
      onLoadedMetadata={(e) => {
        if (!hasInitSeekRef.current) {
          e.currentTarget.currentTime = armed.currentTime;
          hasInitSeekRef.current = true;
        }
        if (Number.isFinite(e.currentTarget.duration)) {
          onDuration(e.currentTarget.duration);
        }
      }}
      onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
      onPlay={() => onPlayingChange(true)}
      onPause={() => onPlayingChange(false)}
      style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
      aria-label="Regie video preview"
    />
  );
}

function ArmedYouTubePlayer({ armed, onTimeUpdate, onPlayingChange, onDuration }: PlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoId = extractYouTubeId(armed.fileUrl);

  const { isSubscribed, stateRef, seek, play, pause, handleIframeLoad } = useYouTubeIframeApi({
    iframeRef,
    listenerId: "regie-preview",
    enabled: !!videoId,
    pollingInterval: 500,
  });

  const hasInitSeekRef = useRef(false);
  const lastPlayingRef = useRef<boolean | null>(null);
  const startPlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial seek once the iframe is subscribed.
  useEffect(() => {
    if (!isSubscribed || hasInitSeekRef.current) return;
    if (armed.currentTime > 0) seek(armed.currentTime);
    hasInitSeekRef.current = true;
  }, [isSubscribed, armed.currentTime, seek]);

  // Drift-correct currentTime against the armed state.
  useEffect(() => {
    if (!isSubscribed || !hasInitSeekRef.current) return;
    if (Math.abs(stateRef.current.currentTime - armed.currentTime) > YT_SYNC_THRESHOLD_S) {
      seek(armed.currentTime);
    }
  }, [isSubscribed, armed.currentTime, seek, stateRef]);

  // Drive isPlaying. Force the player out of UNSTARTED on first start by seeking
  // before play (autoplay=0 embeds silently no-op a bare playVideo otherwise).
  useEffect(() => {
    if (!isSubscribed) return;
    if (armed.isPlaying === lastPlayingRef.current) return;
    lastPlayingRef.current = armed.isPlaying;
    if (armed.isPlaying) {
      seek(armed.currentTime);
      if (startPlayTimeoutRef.current) clearTimeout(startPlayTimeoutRef.current);
      startPlayTimeoutRef.current = setTimeout(() => {
        startPlayTimeoutRef.current = null;
        play();
      }, 80);
    } else {
      pause();
    }
  }, [isSubscribed, armed.isPlaying, armed.currentTime, seek, play, pause]);

  useEffect(() => {
    return () => {
      if (startPlayTimeoutRef.current) {
        clearTimeout(startPlayTimeoutRef.current);
        startPlayTimeoutRef.current = null;
      }
    };
  }, []);

  // Poll YouTube state and forward to the armed store.
  useEffect(() => {
    if (!isSubscribed) return;
    const id = setInterval(() => {
      const s = stateRef.current;
      if (Number.isFinite(s.currentTime)) onTimeUpdate(s.currentTime);
      onPlayingChange(s.isPlaying);
      if (Number.isFinite(s.duration) && s.duration > 0) onDuration(s.duration);
    }, 500);
    return () => clearInterval(id);
  }, [isSubscribed, stateRef, onTimeUpdate, onPlayingChange, onDuration]);

  if (!videoId) {
    return <PlayerError message="Invalid YouTube URL" />;
  }

  const url = buildYouTubeEmbedUrl({
    videoId,
    startTime: armed.startTime,
    endTime: armed.endTime,
    endBehavior: armed.endBehavior,
    autoplay: false,
    mute: true,
    controls: false,
  });

  return (
    <iframe
      ref={iframeRef}
      src={url}
      title="YouTube regie preview"
      allow="autoplay; encrypted-media"
      style={{ width: "100%", height: "100%", border: 0, background: "#000" }}
      onLoad={handleIframeLoad}
    />
  );
}

function PlayerError({ message }: { message: string }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#111",
        color: "#888",
        fontSize: 13,
      }}
    >
      {message}
    </div>
  );
}

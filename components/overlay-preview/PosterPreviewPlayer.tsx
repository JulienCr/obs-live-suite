"use client";

import { useEffect, useRef } from "react";
import { buildYouTubeEmbedUrl } from "@/lib/utils/youtubeUrlBuilder";
import { extractYouTubeId } from "@/lib/utils/urlDetection";
import { useYouTubeIframeApi } from "@/hooks/useYouTubeIframeApi";
import type { PreviewPoster, PreviewPlaybackState, PreviewState } from "@/hooks/usePosterPreviewState";

/** Drift threshold above which we re-seek the local player to the live state. */
const MP4_SYNC_THRESHOLD_S = 0.4;
const YT_SYNC_THRESHOLD_S = 1.0;

type NonNullPreviewState = Exclude<PreviewState, null>;

interface PosterPreviewPlayerProps {
  state: NonNullPreviewState;
}

/**
 * Video/YouTube player used by the regie preview. Always muted.
 * - Live mode: passively mirrors the overlay's playback state.
 * - Cue mode: locally controlled, reports state back to the cue store.
 */
export function PosterPreviewPlayer({ state }: PosterPreviewPlayerProps) {
  if (state.mode === "live") {
    return <LivePlayer poster={state.poster} playback={state.playback} />;
  }
  return (
    <CuePlayer
      poster={state.poster}
      currentTime={state.cue.currentTime}
      isPlaying={state.cue.isPlaying}
      onTimeUpdate={state.updateCueTime}
      onPlayingChange={state.updateCuePlaying}
    />
  );
}

// ---------------------------------------------------------------------------
// Live: mirror the overlay state
// ---------------------------------------------------------------------------

function LivePlayer({ poster, playback }: { poster: PreviewPoster; playback: PreviewPlaybackState }) {
  if (poster.type === "video") {
    return <LiveVideo poster={poster} playback={playback} />;
  }
  return <LiveYouTube poster={poster} playback={playback} />;
}

function LiveVideo({ poster, playback }: { poster: PreviewPoster; playback: PreviewPlaybackState }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (Math.abs(video.currentTime - playback.currentTime) > MP4_SYNC_THRESHOLD_S) {
      video.currentTime = playback.currentTime;
    }
    if (playback.isPlaying && video.paused) {
      video.play().catch(() => {
        /* Autoplay blocked — muted should make this allowed, but ignore. */
      });
    } else if (!playback.isPlaying && !video.paused) {
      video.pause();
    }
  }, [playback]);

  return (
    <video
      ref={videoRef}
      src={poster.fileUrl}
      muted
      playsInline
      loop={poster.endBehavior === "loop"}
      style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
      aria-label="Regie video preview"
    />
  );
}

function LiveYouTube({ poster, playback }: { poster: PreviewPoster; playback: PreviewPlaybackState }) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoId = extractYouTubeId(poster.fileUrl);

  const { isSubscribed, stateRef, seek, play, pause, handleIframeLoad } = useYouTubeIframeApi({
    iframeRef,
    listenerId: "regie-preview",
    enabled: !!videoId,
    pollingInterval: 500,
  });

  const lastPlayingRef = useRef<boolean | null>(null);
  useEffect(() => {
    if (!isSubscribed) return;
    if (Math.abs(stateRef.current.currentTime - playback.currentTime) > YT_SYNC_THRESHOLD_S) {
      seek(playback.currentTime);
    }
    if (playback.isPlaying !== lastPlayingRef.current) {
      lastPlayingRef.current = playback.isPlaying;
      if (playback.isPlaying) play();
      else pause();
    }
  }, [playback, isSubscribed, stateRef, seek, play, pause]);

  if (!videoId) {
    return <PlayerError message="Invalid YouTube URL" />;
  }

  const url = buildYouTubeEmbedUrl({
    videoId,
    startTime: poster.startTime,
    endTime: poster.endTime,
    endBehavior: poster.endBehavior,
    autoplay: false, // live mode: driven by the overlay's state, so start paused
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

// ---------------------------------------------------------------------------
// Cue: locally controlled; reports state back to the cue store
// ---------------------------------------------------------------------------

interface CuePlayerInternalProps {
  poster: PreviewPoster;
  currentTime: number;
  isPlaying: boolean;
  onTimeUpdate: (t: number) => void;
  onPlayingChange: (playing: boolean) => void;
}

function CuePlayer({ poster, currentTime, isPlaying, onTimeUpdate, onPlayingChange }: CuePlayerInternalProps) {
  if (poster.type === "video") {
    return (
      <CueVideo
        poster={poster}
        currentTime={currentTime}
        isPlaying={isPlaying}
        onTimeUpdate={onTimeUpdate}
        onPlayingChange={onPlayingChange}
      />
    );
  }
  return (
    <CueYouTube
      poster={poster}
      currentTime={currentTime}
      isPlaying={isPlaying}
      onTimeUpdate={onTimeUpdate}
      onPlayingChange={onPlayingChange}
    />
  );
}

function CueVideo({ poster, currentTime, isPlaying, onTimeUpdate, onPlayingChange }: CuePlayerInternalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hasInitSeekRef = useRef(false);
  const initialTimeRef = useRef(currentTime);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || hasInitSeekRef.current) return;
    if (video.readyState >= 1) {
      video.currentTime = initialTimeRef.current;
      hasInitSeekRef.current = true;
    }
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying]);

  return (
    <video
      ref={videoRef}
      src={poster.fileUrl}
      muted
      playsInline
      loop={poster.endBehavior === "loop"}
      onLoadedMetadata={(e) => {
        if (!hasInitSeekRef.current) {
          e.currentTarget.currentTime = currentTime;
          hasInitSeekRef.current = true;
        }
      }}
      onTimeUpdate={(e) => onTimeUpdate(e.currentTarget.currentTime)}
      onPlay={() => onPlayingChange(true)}
      onPause={() => onPlayingChange(false)}
      style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
      aria-label="Regie cue video preview"
    />
  );
}

function CueYouTube({ poster, currentTime, isPlaying, onTimeUpdate, onPlayingChange }: CuePlayerInternalProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoId = extractYouTubeId(poster.fileUrl);

  const { isSubscribed, stateRef, seek, play, pause, handleIframeLoad } = useYouTubeIframeApi({
    iframeRef,
    listenerId: "regie-cue",
    enabled: !!videoId,
    pollingInterval: 500,
  });

  const hasInitSeekRef = useRef(false);
  useEffect(() => {
    if (!isSubscribed) return;
    if (!hasInitSeekRef.current && currentTime > 0) {
      seek(currentTime);
      hasInitSeekRef.current = true;
    }
  }, [isSubscribed, currentTime, seek]);

  useEffect(() => {
    if (!isSubscribed) return;
    if (isPlaying) play();
    else pause();
  }, [isSubscribed, isPlaying, play, pause]);

  // Poll YouTube state and forward to the cue store.
  useEffect(() => {
    if (!isSubscribed) return;
    const id = setInterval(() => {
      const s = stateRef.current;
      if (Number.isFinite(s.currentTime)) {
        onTimeUpdate(s.currentTime);
      }
      onPlayingChange(s.isPlaying);
    }, 500);
    return () => clearInterval(id);
  }, [isSubscribed, stateRef, onTimeUpdate, onPlayingChange]);

  if (!videoId) {
    return <PlayerError message="Invalid YouTube URL" />;
  }

  const url = buildYouTubeEmbedUrl({
    videoId,
    startTime: poster.startTime,
    endTime: poster.endTime,
    endBehavior: poster.endBehavior,
    autoplay: false, // cue player driven by local controls
    mute: true,
    controls: false,
  });

  return (
    <iframe
      ref={iframeRef}
      src={url}
      title="YouTube regie cue preview"
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

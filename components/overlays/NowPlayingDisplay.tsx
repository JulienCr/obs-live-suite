"use client";

import { m } from "framer-motion";
import type { MediaPlayerDriverId } from "@/lib/models/MediaPlayer";

interface NowPlayingDisplayProps {
  artworkUrl: string | null;
  track: string;
  artist: string | null;
  driverId: MediaPlayerDriverId | null;
}

const DRIVER_LABELS: Record<string, string> = {
  youtube: "YouTube",
  artlist: "Artlist",
};

/**
 * Now-playing card positioned bottom-left with slide-in/out animation.
 * Designed as an OBS browser source overlay (1920x1080, transparent background).
 */
export function NowPlayingDisplay({ artworkUrl, track, artist, driverId }: NowPlayingDisplayProps) {
  return (
    <m.div
      className="fixed bottom-8 left-8 flex items-center gap-4 rounded-xl px-5 py-3 shadow-2xl"
      style={{
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        maxWidth: 480,
      }}
      initial={{ x: -320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -320, opacity: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
    >
      {/* Artwork */}
      {artworkUrl ? (
        <img
          src={artworkUrl}
          alt=""
          className="h-[80px] w-[80px] rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="h-[80px] w-[80px] rounded-lg shrink-0 bg-white/10 flex items-center justify-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-white/50"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
      )}

      {/* Track info */}
      <div className="min-w-0 flex-1">
        <div className="truncate text-base font-semibold text-white leading-tight">
          {track}
        </div>
        {artist && (
          <div className="truncate text-sm text-white/70 mt-0.5">
            {artist}
          </div>
        )}
        {driverId && (
          <div className="text-[11px] text-white/40 mt-1 uppercase tracking-wide">
            {DRIVER_LABELS[driverId] ?? driverId}
          </div>
        )}
      </div>
    </m.div>
  );
}

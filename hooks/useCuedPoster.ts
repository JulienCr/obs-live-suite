"use client";

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "ols.cuedPoster";

/**
 * Cued poster: a poster the operator has loaded locally to scrub/align before
 * sending it to the overlay. Local to the owner's browser (not shared).
 */
export interface CuedPosterState {
  posterId: string;
  currentTime: number;
  isPlaying: boolean;
  /** Display mode that will be used when the cue is sent to air. */
  displayMode: "left" | "right" | "bigpicture";
}

function loadInitial(): CuedPosterState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CuedPosterState;
    if (typeof parsed.posterId === "string" && typeof parsed.currentTime === "number") {
      return parsed;
    }
  } catch {
    // ignore malformed entry
  }
  return null;
}

function persist(state: CuedPosterState | null): void {
  if (typeof window === "undefined") return;
  try {
    if (state) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // localStorage may be full or disabled; cue state is ephemeral enough to ignore.
  }
}

export interface UseCuedPosterReturn {
  cue: CuedPosterState | null;
  setCue: (cue: CuedPosterState) => void;
  updateCueTime: (currentTime: number) => void;
  updateCuePlaying: (isPlaying: boolean) => void;
  clearCue: () => void;
}

export function useCuedPoster(): UseCuedPosterReturn {
  const [cue, setCueState] = useState<CuedPosterState | null>(() => loadInitial());

  useEffect(() => {
    persist(cue);
  }, [cue]);

  const setCue = useCallback((next: CuedPosterState) => {
    setCueState(next);
  }, []);

  const updateCueTime = useCallback((currentTime: number) => {
    setCueState((prev) => (prev ? { ...prev, currentTime } : prev));
  }, []);

  const updateCuePlaying = useCallback((isPlaying: boolean) => {
    setCueState((prev) => (prev ? { ...prev, isPlaying } : prev));
  }, []);

  const clearCue = useCallback(() => {
    setCueState(null);
  }, []);

  return { cue, setCue, updateCueTime, updateCuePlaying, clearCue };
}

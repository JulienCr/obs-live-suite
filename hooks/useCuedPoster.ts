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

const VALID_DISPLAY_MODES: ReadonlySet<CuedPosterState["displayMode"]> = new Set([
  "left",
  "right",
  "bigpicture",
]);

function loadInitial(): CuedPosterState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CuedPosterState>;
    if (
      typeof parsed.posterId !== "string" ||
      typeof parsed.currentTime !== "number" ||
      typeof parsed.isPlaying !== "boolean" ||
      typeof parsed.displayMode !== "string" ||
      !VALID_DISPLAY_MODES.has(parsed.displayMode as CuedPosterState["displayMode"])
    ) {
      return null;
    }
    return parsed as CuedPosterState;
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

  // Skip identical updates so downstream effects (localStorage persist,
  // re-renders of the preview overlay) don't fire on every poll tick.
  const updateCueTime = useCallback((currentTime: number) => {
    setCueState((prev) => {
      if (!prev || prev.currentTime === currentTime) return prev;
      return { ...prev, currentTime };
    });
  }, []);

  const updateCuePlaying = useCallback((isPlaying: boolean) => {
    setCueState((prev) => {
      if (!prev || prev.isPlaying === isPlaying) return prev;
      return { ...prev, isPlaying };
    });
  }, []);

  const clearCue = useCallback(() => {
    setCueState(null);
  }, []);

  return { cue, setCue, updateCueTime, updateCuePlaying, clearCue };
}

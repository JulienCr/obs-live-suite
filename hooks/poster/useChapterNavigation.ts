"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { VideoChapter, ChapterJumpPayload } from "@/lib/models/OverlayEvents";

/**
 * Chapter navigation state
 */
export interface ChapterState {
  chapters: VideoChapter[];
  currentChapterIndex: number;
}

/**
 * Options for the useChapterNavigation hook
 */
export interface UseChapterNavigationOptions {
  /** Function to get the current playback time */
  getCurrentTime: () => number;
  /** Function to seek to a specific time */
  seekToTime: (time: number) => void;
}

/**
 * Return type for the useChapterNavigation hook
 */
export interface UseChapterNavigationReturn {
  /** Current chapter state with chapters array and current index */
  chapterState: ChapterState;
  /** Set chapters array (will be sorted by timestamp) */
  setChapters: (chapters: VideoChapter[]) => void;
  /** Navigate to the next chapter */
  navigateToNextChapter: () => void;
  /** Navigate to the previous chapter (or start of current if > 3s in) */
  navigateToPreviousChapter: () => void;
  /** Jump to a specific chapter by index or id */
  jumpToChapter: (payload: ChapterJumpPayload) => void;
}

/**
 * Hook for managing chapter navigation in video playback.
 * Provides chapter state management and navigation functions.
 *
 * @param options - Configuration options with getCurrentTime and seekToTime callbacks
 * @returns Chapter state and navigation functions
 *
 * @example
 * ```tsx
 * const { chapterState, setChapters, navigateToNextChapter } = useChapterNavigation({
 *   getCurrentTime: () => videoRef.current?.currentTime ?? 0,
 *   seekToTime: (time) => { if (videoRef.current) videoRef.current.currentTime = time; }
 * });
 * ```
 */
export function useChapterNavigation(
  options: UseChapterNavigationOptions
): UseChapterNavigationReturn {
  const { getCurrentTime, seekToTime } = options;

  const [chapterState, setChapterState] = useState<ChapterState>({
    chapters: [],
    currentChapterIndex: -1,
  });

  // Ref for synchronous access to chapters (avoids stale closure issues)
  const chaptersRef = useRef<VideoChapter[]>([]);

  /**
   * Find the current chapter index based on playback time.
   * Returns the index of the last chapter whose timestamp is <= currentTime.
   */
  const findCurrentChapterIndex = useCallback(
    (currentTime: number, chapters: VideoChapter[]): number => {
      if (chapters.length === 0) return -1;

      // Find the last chapter whose timestamp is <= currentTime
      let chapterIndex = -1;
      for (let i = 0; i < chapters.length; i++) {
        if (chapters[i].timestamp <= currentTime) {
          chapterIndex = i;
        } else {
          break;
        }
      }
      return chapterIndex;
    },
    []
  );

  /**
   * Set chapters array. Chapters will be sorted by timestamp.
   * Initial chapter index is set to 0 if chapters exist.
   * Updates ref synchronously for immediate access by other callbacks.
   */
  const setChapters = useCallback((chapters: VideoChapter[]) => {
    if (chapters.length === 0) {
      // Update ref IMMEDIATELY (synchronous) to avoid stale closure
      chaptersRef.current = [];
      setChapterState({ chapters: [], currentChapterIndex: -1 });
      return;
    }

    // Sort chapters by timestamp
    const sortedChapters = [...chapters].sort((a, b) => a.timestamp - b.timestamp);

    // Update ref IMMEDIATELY (synchronous) to avoid stale closure
    chaptersRef.current = sortedChapters;

    setChapterState({
      chapters: sortedChapters,
      currentChapterIndex: 0,
    });
  }, []);

  /**
   * Navigate to the next chapter
   * Uses ref for chapters to avoid stale closure issues
   */
  const navigateToNextChapter = useCallback(() => {
    const chapters = chaptersRef.current;
    const { currentChapterIndex } = chapterState;
    if (chapters.length === 0) return;

    const nextIndex = currentChapterIndex + 1;
    if (nextIndex < chapters.length) {
      const nextChapter = chapters[nextIndex];
      seekToTime(nextChapter.timestamp);
      setChapterState((prev) => ({ ...prev, currentChapterIndex: nextIndex }));
    }
  }, [chapterState.currentChapterIndex, seekToTime]);

  /**
   * Navigate to the previous chapter.
   * If more than 3 seconds into the current chapter, go to start of current chapter.
   * Otherwise, go to the previous chapter.
   * Uses ref for chapters to avoid stale closure issues
   */
  const navigateToPreviousChapter = useCallback(() => {
    const chapters = chaptersRef.current;
    const { currentChapterIndex } = chapterState;
    if (chapters.length === 0) return;

    const currentTime = getCurrentTime();
    const currentChapter = chapters[currentChapterIndex];

    // If we're more than 3 seconds into the current chapter, go to start of current chapter
    // Otherwise, go to the previous chapter
    if (currentChapter && currentTime - currentChapter.timestamp > 3) {
      seekToTime(currentChapter.timestamp);
    } else {
      const prevIndex = Math.max(0, currentChapterIndex - 1);
      const prevChapter = chapters[prevIndex];
      if (prevChapter) {
        seekToTime(prevChapter.timestamp);
        setChapterState((prev) => ({ ...prev, currentChapterIndex: prevIndex }));
      }
    }
  }, [chapterState.currentChapterIndex, getCurrentTime, seekToTime]);

  /**
   * Jump to a specific chapter by index or id
   * Uses ref for chapters to avoid stale closure issues when called
   * immediately after setChapters (before React state update completes)
   */
  const jumpToChapter = useCallback(
    (payload: ChapterJumpPayload) => {
      // Use ref instead of state to get the current chapters immediately
      const chapters = chaptersRef.current;
      if (chapters.length === 0) return;

      let targetIndex = -1;

      if ("chapterIndex" in payload) {
        targetIndex = payload.chapterIndex;
      } else if ("chapterId" in payload) {
        targetIndex = chapters.findIndex((c) => c.id === payload.chapterId);
      }

      if (targetIndex >= 0 && targetIndex < chapters.length) {
        const targetChapter = chapters[targetIndex];
        seekToTime(targetChapter.timestamp);
        setChapterState((prev) => ({ ...prev, currentChapterIndex: targetIndex }));
      }
    },
    [seekToTime]
  );

  // Update current chapter index based on playback time every 500ms
  useEffect(() => {
    if (chapterState.chapters.length === 0) return;

    const updateChapterIndex = () => {
      const currentTime = getCurrentTime();
      const newIndex = findCurrentChapterIndex(currentTime, chapterState.chapters);
      if (newIndex !== chapterState.currentChapterIndex) {
        setChapterState((prev) => ({ ...prev, currentChapterIndex: newIndex }));
      }
    };

    const interval = setInterval(updateChapterIndex, 500);
    return () => clearInterval(interval);
  }, [
    chapterState.chapters,
    chapterState.currentChapterIndex,
    getCurrentTime,
    findCurrentChapterIndex,
  ]);

  return {
    chapterState,
    setChapters,
    navigateToNextChapter,
    navigateToPreviousChapter,
    jumpToChapter,
  };
}

export default useChapterNavigation;

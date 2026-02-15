import type { ChapterJumpPayload } from "@/lib/models/OverlayEvents";
import type { UsePosterPlaybackReturn } from "./usePosterPlayback";
import type { UseChapterNavigationReturn } from "./useChapterNavigation";

/**
 * Shared playback command handlers for PosterRenderer and BigPicturePosterRenderer.
 *
 * These handlers are identical across both renderers: hide, play, pause, seek,
 * mute, unmute, and chapter navigation. Extracting them eliminates ~100 lines
 * of duplication between the two components.
 */

interface PosterPlaybackEvent {
  type: string;
  payload?: { time?: number; chapterIndex?: number; chapterId?: string };
}

/** Minimal state shape shared by both PosterState and BigPicturePosterState */
interface PosterStateBase {
  visible: boolean;
  current: unknown;
}

/**
 * Handle a "hide" event: stop all media, reset state, and schedule cleanup.
 */
export function handlePosterHide<T extends PosterStateBase>(
  playback: UsePosterPlaybackReturn,
  setState: React.Dispatch<React.SetStateAction<T>>,
  cleanupTimeout: React.MutableRefObject<NodeJS.Timeout | undefined>
): void {
  if (playback.videoRef.current) {
    playback.videoRef.current.pause();
    playback.videoRef.current.currentTime = 0;
  }
  if (playback.youtubeRef.current) {
    playback.youtubeRef.current.contentWindow?.postMessage(
      '{"event":"command","func":"stopVideo","args":""}',
      "*"
    );
  }

  playback.youtubeStateRef.current = {
    currentTime: 0,
    duration: 900,
    isPlaying: false,
    isMuted: true,
  };

  setState((prev) => ({ ...prev, visible: false, current: null }));

  cleanupTimeout.current = setTimeout(() => {
    if (playback.videoRef.current) {
      playback.videoRef.current.src = "";
      playback.videoRef.current.load();
    }
  }, 600);
}

/**
 * Handle playback control events: play, pause, seek, mute, unmute,
 * and chapter navigation (chapter-next, chapter-previous, chapter-jump).
 *
 * Returns true if the event was handled, false otherwise.
 */
export function handlePosterPlaybackEvent(
  data: PosterPlaybackEvent,
  playback: UsePosterPlaybackReturn,
  chapters: UseChapterNavigationReturn
): boolean {
  switch (data.type) {
    case "play":
      if (playback.videoRef.current) {
        playback.videoRef.current.play();
      }
      if (playback.youtubeRef.current) {
        playback.youtubeRef.current.contentWindow?.postMessage(
          '{"event":"command","func":"playVideo","args":""}',
          "*"
        );
        playback.youtubeStateRef.current.isPlaying = true;
      }
      playback.setPlaybackState((prev) => ({ ...prev, isPlaying: true }));
      return true;

    case "pause":
      if (playback.videoRef.current) {
        playback.videoRef.current.pause();
      }
      if (playback.youtubeRef.current) {
        playback.youtubeRef.current.contentWindow?.postMessage(
          '{"event":"command","func":"pauseVideo","args":""}',
          "*"
        );
        playback.youtubeStateRef.current.isPlaying = false;
      }
      playback.setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
      return true;

    case "seek": {
      const seekTime = data.payload?.time || 0;
      if (playback.videoRef.current) {
        playback.videoRef.current.currentTime = seekTime;
      }
      if (playback.youtubeRef.current) {
        playback.youtubeRef.current.contentWindow?.postMessage(
          `{"event":"command","func":"seekTo","args":[${seekTime}, true]}`,
          "*"
        );
        playback.youtubeStateRef.current.currentTime = seekTime;
      }
      playback.setPlaybackState((prev) => ({ ...prev, currentTime: seekTime }));
      return true;
    }

    case "mute":
      if (playback.videoRef.current) {
        playback.videoRef.current.muted = true;
      }
      if (playback.youtubeRef.current) {
        playback.youtubeRef.current.contentWindow?.postMessage(
          '{"event":"command","func":"mute","args":""}',
          "*"
        );
        playback.youtubeStateRef.current.isMuted = true;
      }
      playback.setPlaybackState((prev) => ({ ...prev, isMuted: true }));
      return true;

    case "unmute":
      if (playback.videoRef.current) {
        playback.videoRef.current.muted = false;
      }
      if (playback.youtubeRef.current) {
        playback.youtubeRef.current.contentWindow?.postMessage(
          '{"event":"command","func":"unMute","args":""}',
          "*"
        );
        playback.youtubeStateRef.current.isMuted = false;
      }
      playback.setPlaybackState((prev) => ({ ...prev, isMuted: false }));
      return true;

    case "chapter-next":
      chapters.navigateToNextChapter();
      return true;

    case "chapter-previous":
      chapters.navigateToPreviousChapter();
      return true;

    case "chapter-jump":
      if (
        data.payload &&
        ("chapterIndex" in data.payload || "chapterId" in data.payload)
      ) {
        chapters.jumpToChapter(data.payload as ChapterJumpPayload);
      }
      return true;

    default:
      return false;
  }
}

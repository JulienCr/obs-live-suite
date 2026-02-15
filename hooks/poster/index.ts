// Poster overlay hooks - shared between PosterRenderer and BigPicturePosterRenderer

export {
  useChapterNavigation,
  type ChapterState,
  type UseChapterNavigationOptions,
  type UseChapterNavigationReturn,
} from "./useChapterNavigation";

export {
  usePosterPlayback,
  type PlaybackState,
  type UsePosterPlaybackOptions,
  type UsePosterPlaybackReturn,
} from "./usePosterPlayback";

export {
  useSubVideoPlayback,
  type SubVideoConfig,
  type UseSubVideoPlaybackOptions,
  type UseSubVideoPlaybackReturn,
} from "./useSubVideoPlayback";

export {
  handlePosterHide,
  handlePosterPlaybackEvent,
} from "./posterEventHandlers";

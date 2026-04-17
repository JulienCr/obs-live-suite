/**
 * Helpers for deriving the effective duration displayed in the dashboard
 * PosterCard timeline/controls.
 *
 * Why this exists: WebM files without duration metadata in their header report
 * `HTMLVideoElement.duration === Infinity` (or NaN) until fully scanned. The
 * overlay-side tick filters > 0 through, but `Infinity` / `NaN` are dropped on
 * the dashboard side (`isFinite`), leaving duration at 0 and the UI showing
 * "pas de durée". The DB-stored poster.duration is reliable (computed at
 * upload time), so we use it as a fallback.
 */

export interface EffectivePosterDurationInput {
  /** Duration reported live by the overlay via WebSocket (seconds). */
  playbackDuration: number;
  /** DB-stored poster.duration (seconds), from the posters API. */
  posterDuration: number | null | undefined;
  /** Sub-clip start time (seconds), 0 if none. */
  clipStart: number;
  /** Sub-clip end time (seconds), 0 if none. */
  clipEnd: number;
}

/**
 * Compute the effective duration to display in the dashboard timeline / counter.
 *
 * Priority:
 *   1. If a sub-clip is configured AND clipEnd > 0: use clipEnd - clipStart.
 *   2. Otherwise, use the live playback duration when it is a positive finite number.
 *   3. Otherwise, fall back to the DB-stored poster.duration.
 *   4. Otherwise, 0.
 */
export function getEffectivePosterDuration(
  input: EffectivePosterDurationInput
): number {
  const { playbackDuration, posterDuration, clipStart, clipEnd } = input;

  const hasSubClip = clipStart > 0 || clipEnd > 0;
  if (hasSubClip && clipEnd > 0) {
    return clipEnd - clipStart;
  }

  if (
    typeof playbackDuration === "number" &&
    isFinite(playbackDuration) &&
    playbackDuration > 0
  ) {
    return playbackDuration;
  }

  if (
    typeof posterDuration === "number" &&
    isFinite(posterDuration) &&
    posterDuration > 0
  ) {
    return posterDuration;
  }

  return 0;
}

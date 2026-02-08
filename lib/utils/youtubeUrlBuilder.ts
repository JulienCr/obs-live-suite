/**
 * YouTube Embed URL Builder
 * 
 * Utility for constructing YouTube embed URLs with precise timing and behavior controls.
 */

export interface YouTubeEmbedOptions {
  /** YouTube video ID (e.g., "dQw4w9WgXcQ") */
  videoId: string;
  
  /** 
   * Start time in seconds
   * Maps to YouTube's `start` parameter
   * @see https://developers.google.com/youtube/player_parameters#start
   */
  startTime?: number;
  
  /** 
   * End time in seconds
   * Maps to YouTube's `end` parameter
   * @see https://developers.google.com/youtube/player_parameters#end
   */
  endTime?: number;
  
  /** 
   * Behavior when video reaches end time
   * - "stop": Video pauses at end time (default YouTube behavior)
   * - "loop": Video loops back to start time (requires playlist parameter)
   * @see https://developers.google.com/youtube/player_parameters#loop
   */
  endBehavior?: "stop" | "loop";
  
  /** 
   * Auto-start video on load
   * Maps to YouTube's `autoplay` parameter (1 = true, 0 = false)
   * @default true
   * @see https://developers.google.com/youtube/player_parameters#autoplay
   */
  autoplay?: boolean;
  
  /** 
   * Mute video on load
   * Maps to YouTube's `mute` parameter (1 = true, 0 = false)
   * @default true
   * @see https://developers.google.com/youtube/player_parameters#mute
   */
  mute?: boolean;
  
  /** 
   * Show video controls
   * Maps to YouTube's `controls` parameter (1 = show, 0 = hide)
   * @default false
   * @see https://developers.google.com/youtube/player_parameters#controls
   */
  controls?: boolean;
}

/**
 * Build a YouTube embed URL with timing and behavior parameters.
 * 
 * @param options - Configuration options for the embed URL
 * @returns Complete YouTube embed URL with query parameters
 * 
 * @example
 * ```typescript
 * // Basic embed with autoplay
 * buildYouTubeEmbedUrl({ videoId: "dQw4w9WgXcQ" })
 * // => "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&controls=0"
 * 
 * // Embed with start/end times and loop
 * buildYouTubeEmbedUrl({
 *   videoId: "dQw4w9WgXcQ",
 *   startTime: 10,
 *   endTime: 30,
 *   endBehavior: "loop"
 * })
 * // => "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&controls=0&start=10&end=30&loop=1&playlist=dQw4w9WgXcQ"
 * ```
 * 
 * @remarks
 * - Loop behavior requires the `playlist` parameter to be set to the same video ID
 * - Autoplay may be blocked by browser policies unless video is muted
 * - All timing parameters are in seconds (integer)
 */
export function buildYouTubeEmbedUrl(options: YouTubeEmbedOptions): string {
  const {
    videoId,
    startTime,
    endTime,
    endBehavior = "stop",
    autoplay = true,
    mute = true,
    controls = false,
  } = options;

  // Base embed URL
  const baseUrl = `https://www.youtube.com/embed/${videoId}`;
  
  // Build query parameters using URLSearchParams for clean URL construction
  const params = new URLSearchParams();
  
  // Standard embed parameters
  params.set("autoplay", autoplay ? "1" : "0");
  params.set("mute", mute ? "1" : "0");
  params.set("controls", controls ? "1" : "0");
  
  // Timing parameters
  if (startTime !== undefined) {
    params.set("start", startTime.toString());
  }
  
  if (endTime !== undefined) {
    params.set("end", endTime.toString());
  }
  
  // Loop behavior
  // IMPORTANT: YouTube's loop parameter requires the playlist parameter
  // to be set to the same video ID for single-video looping
  // @see https://developers.google.com/youtube/player_parameters#loop
  if (endBehavior === "loop") {
    params.set("loop", "1");
    params.set("playlist", videoId);
  }
  
  return `${baseUrl}?${params.toString()}`;
}

const MAX_CACHE = 20;
const audioCache = new Map<string, HTMLAudioElement>();

/**
 * Play a sound from URL with caching.
 * Safe to call in OBS browser sources (errors are silenced).
 */
export function playSound(url: string) {
  try {
    let audio = audioCache.get(url);
    if (!audio) {
      audio = new Audio(url);
      if (audioCache.size >= MAX_CACHE) {
        const oldest = audioCache.keys().next().value!;
        audioCache.delete(oldest);
      }
      audioCache.set(url, audio);
    }
    audio.currentTime = 0;
    audio.play().catch(() => {});
  } catch {
    // Audio may fail in some browser source configs
  }
}

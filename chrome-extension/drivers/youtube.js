/**
 * YouTube Media Player Driver
 *
 * Uses the native HTMLVideoElement API for reliable control,
 * with DOM selectors for metadata extraction.
 */

/* global window, document */

function getVideo() {
  return document.querySelector("video");
}

function formatTime(seconds) {
  if (isNaN(seconds) || seconds === Infinity) return null;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const fadeOutAndStop = window.__createFadeOutHandler(
  () => {
    const v = getVideo();
    return v ? v.volume : 1;
  },
  (vol) => {
    const v = getVideo();
    if (v) v.volume = vol;
  },
  (restoreVolume) => {
    const v = getVideo();
    if (v) {
      v.pause();
      v.currentTime = 0;
    }
    setTimeout(restoreVolume, 200);
  }
);

function getStatus() {
  const video = getVideo();
  if (!video) {
    return { track: null, artist: null, current: null, total: null, playing: false };
  }

  // Try to get title from the page
  const titleEl =
    document.querySelector("h1.ytd-video-primary-info-renderer yt-formatted-string") ||
    document.querySelector("h1.ytd-watch-metadata yt-formatted-string") ||
    document.querySelector("#title h1 yt-formatted-string");
  const title = titleEl?.textContent?.trim() || document.title.replace(/ - YouTube$/, "");

  // Try to get channel name
  const channelEl =
    document.querySelector("#channel-name yt-formatted-string a") ||
    document.querySelector("ytd-channel-name yt-formatted-string a");
  const channel = channelEl?.textContent?.trim() || null;

  return {
    track: title,
    artist: channel,
    current: formatTime(video.currentTime),
    total: formatTime(video.duration),
    playing: !video.paused,
  };
}

// Initialize driver via shared base
window.__initMediaPlayerDriver("youtube", {
  play() { const v = getVideo(); if (v) v.play(); },
  pause() { const v = getVideo(); if (v) v.pause(); },
  stop() {
    const v = getVideo();
    if (v) { v.pause(); v.currentTime = 0; }
  },
  next() {
    // Click YouTube's next button
    const btn = document.querySelector(".ytp-next-button");
    if (btn) btn.click();
  },
  prev() {
    // Seek to start; clicking prev again would need playlist context
    const v = getVideo();
    if (v) v.currentTime = 0;
  },
  replay() {
    const v = getVideo();
    if (v) { v.currentTime = 0; v.play(); }
  },
  fadeout: fadeOutAndStop,
  getStatus,
});

/**
 * Artlist.io Media Player Driver
 *
 * DOM manipulation for Artlist's music player.
 * Ported from artlist-control/extension/content.js.
 */

/* global window */

// Scope metadata selectors to the global player bar to avoid matching playlist rows
const PLAYER = '[data-id="global-player"]';

const SELECTORS = {
  play: `${PLAYER} [data-testid="PlaybackButton"]`,
  next: `${PLAYER} button[aria-label="next track"]`,
  prev: `${PLAYER} button[aria-label="previous track"]`,
  volume: `${PLAYER} input[aria-label="Volume"]`,
  mute: `${PLAYER} button[aria-label="Mute/UnMute"]`,
  waveform: `${PLAYER} [data-testid="UrlWaveformCanvas"]`,
  duration: `${PLAYER} [data-testid="AudioDuration"]`,
  trackName: `${PLAYER} [data-testid="audio-name"] a`,
  artistName: `${PLAYER} [data-testid="artist-name"] a`,
};

const FALLBACK_PATTERNS = {
  play: ["play", "pause"],
  next: ["next"],
  prev: ["prev", "previous"],
};

const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value"
).set;

function findElement(action) {
  const el = document.querySelector(SELECTORS[action]);
  if (el) return el;

  const patterns = FALLBACK_PATTERNS[action];
  if (!patterns) return null;

  const player = document.querySelector(PLAYER);
  if (!player) return null;

  for (const pattern of patterns) {
    const found =
      player.querySelector(`[aria-label*="${pattern}" i]`) ||
      player.querySelector(`[data-testid*="${pattern}" i]`) ||
      player.querySelector(`button[class*="${pattern}" i]`);
    if (found) return found;
  }

  return null;
}

function setVolume(input, value) {
  nativeInputValueSetter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

function seekToStart() {
  const canvas = document.querySelector(SELECTORS.waveform);
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();
  const x = rect.left + 2;
  const y = rect.top + rect.height / 2;

  canvas.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, clientX: x, clientY: y }));
  canvas.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, clientX: x, clientY: y }));
  canvas.dispatchEvent(new MouseEvent("click", { bubbles: true, clientX: x, clientY: y }));
}

const fadeOutAndStop = window.__createFadeOutHandler(
  () => {
    const input = document.querySelector(SELECTORS.volume);
    return input ? parseFloat(input.value) || 1 : 1;
  },
  (v) => {
    const input = document.querySelector(SELECTORS.volume);
    if (input) setVolume(input, v);
  },
  (restoreVolume) => {
    seekToStart();
    setTimeout(() => {
      const playBtn = findElement("play");
      if (playBtn) playBtn.click();
    }, 100);
    setTimeout(restoreVolume, 300);
  }
);

function stopAndReset() {
  const muteBtn = document.querySelector(SELECTORS.mute);
  if (muteBtn) muteBtn.click();

  setTimeout(() => seekToStart(), 50);
  setTimeout(() => {
    const playBtn = findElement("play");
    if (playBtn) playBtn.click();
    if (muteBtn) muteBtn.click();
  }, 100);
}

function getStatus() {
  const durationEl = document.querySelector(SELECTORS.duration);
  const trackEl = document.querySelector(SELECTORS.trackName);
  const artistEl = document.querySelector(SELECTORS.artistName);

  const durationText = durationEl?.textContent?.trim() || "";
  const [current, total] = durationText.split("/").map((s) => s.trim());

  const playBtn = document.querySelector(SELECTORS.play);
  const icon = playBtn?.querySelector("svg[data-icon]");
  const isPlaying = icon?.getAttribute("data-icon") === "pause";

  // Extract album art from global player
  const artworkImg = document.querySelector(`${PLAYER} img[alt^="Album art"]`);
  const artworkUrl = artworkImg?.getAttribute("src") || null;

  return {
    track: trackEl?.textContent?.trim() || null,
    artist: artistEl?.textContent?.trim() || null,
    current: current || null,
    total: total || null,
    playing: isPlaying,
    artworkUrl,
  };
}

// Initialize driver via shared base
window.__initMediaPlayerDriver("artlist", {
  play() { const el = findElement("play"); if (el) el.click(); },
  pause() { const el = findElement("play"); if (el) el.click(); },
  stop: stopAndReset,
  next() { const el = findElement("next"); if (el) el.click(); },
  prev() { const el = findElement("prev"); if (el) el.click(); },
  replay: seekToStart,
  fadeout: fadeOutAndStop,
  getStatus,
});

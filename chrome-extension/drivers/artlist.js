/**
 * Artlist.io Media Player Driver
 *
 * DOM manipulation for Artlist's music player.
 * Ported from artlist-control/extension/content.js.
 */

/* global window */

const SELECTORS = {
  play: '[data-testid="PlaybackButton"]',
  next: 'button[aria-label="next track"]',
  prev: 'button[aria-label="previous track"]',
  volume: 'input[aria-label="Volume"]',
  mute: 'button[aria-label="Mute/UnMute"]',
  waveform: '[data-testid="UrlWaveformCanvas"]',
  duration: '[data-testid="AudioDuration"]',
  trackName: '[data-testid="audio-name"] a',
  artistName: '[data-testid="artist-name"] a',
};

const FALLBACK_PATTERNS = {
  play: ["play", "pause"],
  next: ["next"],
  prev: ["prev", "previous"],
};

const FADE_DURATION_MS = 5000;
const FADE_STEPS = 60;

const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
  HTMLInputElement.prototype,
  "value"
).set;

let fadeInProgress = false;

function findElement(action) {
  const el = document.querySelector(SELECTORS[action]);
  if (el) return el;

  const patterns = FALLBACK_PATTERNS[action];
  if (!patterns) return null;

  for (const pattern of patterns) {
    const found =
      document.querySelector(`[aria-label*="${pattern}" i]`) ||
      document.querySelector(`[data-testid*="${pattern}" i]`) ||
      document.querySelector(`button[class*="${pattern}" i]`);
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

function fadeOutAndStop() {
  const input = document.querySelector(SELECTORS.volume);
  if (!input || fadeInProgress) return;

  fadeInProgress = true;
  const startVolume = parseFloat(input.value) || 1;
  const stepInterval = FADE_DURATION_MS / FADE_STEPS;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    const t = step / FADE_STEPS;
    const volume = startVolume * Math.pow(1 - t, 3); // cubic ease-out

    if (step >= FADE_STEPS) {
      clearInterval(timer);
      setVolume(input, 0);
      seekToStart();

      setTimeout(() => {
        const playBtn = findElement("play");
        if (playBtn) playBtn.click();
      }, 100);

      setTimeout(() => {
        setVolume(input, startVolume);
        fadeInProgress = false;
      }, 300);
      return;
    }

    setVolume(input, Math.max(0, volume));
  }, stepInterval);
}

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

  return {
    track: trackEl?.textContent?.trim() || null,
    artist: artistEl?.textContent?.trim() || null,
    current: current || null,
    total: total || null,
    playing: isPlaying,
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

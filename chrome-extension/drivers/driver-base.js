/**
 * Media Player Driver Base
 *
 * Shared infrastructure for content script drivers. Handles:
 * - Command dispatch from background service worker
 * - Periodic status polling and broadcast
 * - Registration with background on load
 *
 * Each driver calls `initDriver(driverId, handlers)` with its DOM-specific implementations.
 */

/* global chrome */

// Shared constants — keep in sync with MEDIA_PLAYER in lib/config/Constants.ts
const STATUS_POLL_INTERVAL_MS = 2000;
const FADEOUT_DURATION_MS = 5000;
const FADEOUT_STEPS = 60;

/**
 * Create a reusable fadeout handler.
 * Drives volume from current level to 0 using a cubic ease-out curve,
 * then calls onComplete which receives a restoreVolume callback.
 *
 * @param {() => number} getVolume - Returns current volume (0..1)
 * @param {(v: number) => void} setVolume - Sets volume
 * @param {(restore: () => void) => void} onComplete - Called after fade finishes;
 *   call restore() to reset volume to its original value.
 * @returns {() => void} fadeout function
 */
function createFadeOutHandler(getVolume, setVolume, onComplete) {
  let fadeInProgress = false;
  return function fadeOutAndStop() {
    if (fadeInProgress) return;
    fadeInProgress = true;
    const startVolume = getVolume();
    const stepInterval = FADEOUT_DURATION_MS / FADEOUT_STEPS;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      const t = step / FADEOUT_STEPS;
      const volume = startVolume * Math.pow(1 - t, 3); // cubic ease-out

      if (step >= FADEOUT_STEPS) {
        clearInterval(timer);
        setVolume(0);
        onComplete(() => {
          setVolume(startVolume);
          fadeInProgress = false;
        });
        return;
      }

      setVolume(Math.max(0, volume));
    }, stepInterval);
  };
}

/**
 * Initialize a media player driver.
 *
 * @param {string} driverId - e.g. "artlist", "youtube"
 * @param {object} handlers - Driver-specific implementations:
 *   - play(): void
 *   - pause(): void
 *   - stop(): void
 *   - next(): void
 *   - prev(): void
 *   - replay(): void
 *   - fadeout(): void
 *   - getStatus(): { track, artist, current, total, playing }
 */
function initDriver(driverId, handlers) {
  const LOG_PREFIX = `[MediaPlayer:${driverId}]`;

  console.log(`${LOG_PREFIX} Content script loaded`);

  // Listen for commands relayed from background service worker
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type !== "media-player-command" || message.driverId !== driverId) {
      return false;
    }

    const { action, correlationId } = message;
    console.log(`${LOG_PREFIX} Received action: ${action}`);

    try {
      if (action === "status") {
        const status = handlers.getStatus();
        sendResponse({
          type: "media-player-response",
          correlationId,
          success: true,
          data: status,
        });
        return false;
      }

      const handler = handlers[action];
      if (typeof handler === "function") {
        handler();
        sendResponse({
          type: "media-player-response",
          correlationId,
          success: true,
        });
        // Broadcast updated status shortly after command execution
        // so UI reflects the change without waiting for the next poll tick
        setTimeout(() => broadcastStatus(), 150);
      } else {
        sendResponse({
          type: "media-player-response",
          correlationId,
          success: false,
          error: `Unknown action: ${action}`,
        });
      }
    } catch (error) {
      sendResponse({
        type: "media-player-response",
        correlationId,
        success: false,
        error: error.message,
      });
    }

    return false; // synchronous response
  });

  function broadcastStatus() {
    try {
      const status = handlers.getStatus();
      chrome.runtime.sendMessage({
        type: "media-player-status",
        driverId,
        status,
      });
    } catch {
      // Extension context may be invalidated — ignore
    }
  }

  // Periodic status broadcast
  setInterval(broadcastStatus, STATUS_POLL_INTERVAL_MS);

  // Register this driver with the background service worker
  try {
    chrome.runtime.sendMessage({
      type: "media-player-register",
      driverId,
    });
    console.log(`${LOG_PREFIX} Registered with background`);
  } catch {
    // Background may not be ready yet — registration will happen via status poll
  }
}

// Export for use by driver scripts (loaded as content_scripts in sequence)
// eslint-disable-next-line no-unused-vars
window.__initMediaPlayerDriver = initDriver;
// eslint-disable-next-line no-unused-vars
window.__createFadeOutHandler = createFadeOutHandler;

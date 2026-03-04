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

const STATUS_POLL_INTERVAL_MS = 2000;

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

  // Periodic status broadcast
  setInterval(() => {
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
  }, STATUS_POLL_INTERVAL_MS);

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

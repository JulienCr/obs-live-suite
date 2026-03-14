import type { Severity } from "./types";
import { getConfig } from "./config";
import { debugLog } from "./debug";
import { getNotificationEl, setTitle, setBody } from "./dom";
import { stopCountdown } from "./countdown";

let dismissTimeout: ReturnType<typeof setTimeout> | null = null;
let fadeOutTimeout: ReturnType<typeof setTimeout> | null = null;

export interface NotificationMessage {
  title: string;
  body: string;
  severity: Severity;
}

export function showNotification(message: NotificationMessage): void {
  const config = getConfig();
  debugLog(`showNotification: severity=${message.severity} enabled=${config.enabled}`);

  if (!config.enabled) return;

  stopCountdown();
  clearTimers();

  setTitle(message.title);
  setBody(message.body);
  getNotificationEl().className = `notification severity-${message.severity} fade-in`;

  dismissTimeout = setTimeout(() => {
    fadeOutNotification();
  }, config.displayDuration * 1000);
}

export function fadeOutNotification(): void {
  const el = getNotificationEl();
  el.classList.remove("fade-in");
  el.classList.add("fade-out");

  fadeOutTimeout = setTimeout(() => {
    hideNotification();
  }, 500);
}

export function hideNotification(): void {
  clearTimers();
  stopCountdown();
  getNotificationEl().className = "notification hidden";
}

export function clearTimers(): void {
  if (dismissTimeout) {
    clearTimeout(dismissTimeout);
    dismissTimeout = null;
  }
  if (fadeOutTimeout) {
    clearTimeout(fadeOutTimeout);
    fadeOutTimeout = null;
  }
}

/**
 * Schedule a dismiss after `ms` milliseconds.
 * Used by countdown when it finishes.
 */
export function scheduleDismiss(ms: number): void {
  dismissTimeout = setTimeout(() => {
    fadeOutNotification();
  }, ms);
}

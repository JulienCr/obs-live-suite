import type { CuePayload } from "./types";
import { getConfig } from "./config";
import { debugLog } from "./debug";
import { getNotificationEl, setTitle, setBody } from "./dom";
import { clearTimers, scheduleDismiss } from "./notification";

let countdownInterval: ReturnType<typeof setInterval> | null = null;

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  if (m > 0) {
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  }
  return `${s}`;
}

export function showCountdown(payload: CuePayload): void {
  const config = getConfig();
  debugLog(`showCountdown: ${JSON.stringify(payload.countdownPayload)}`);

  if (!config.enabled) return;

  stopCountdown();
  clearTimers();

  const cp = payload.countdownPayload!;
  let remaining: number;

  if (cp.mode === "targetTime" && cp.targetTime) {
    remaining = Math.max(
      0,
      Math.round((new Date(cp.targetTime).getTime() - Date.now()) / 1000),
    );
  } else {
    remaining = cp.durationSec ?? 60;
  }

  setTitle(payload.title || "COUNTDOWN");
  setBody(formatTime(remaining));
  getNotificationEl().className = "notification severity-warn fade-in";

  countdownInterval = setInterval(() => {
    remaining--;

    if (remaining <= 0) {
      setBody("0:00");
      getNotificationEl().className = "notification severity-urgent fade-in";
      stopCountdown();
      scheduleDismiss(3000);
      return;
    }

    setBody(formatTime(remaining));

    if (remaining <= 10) {
      getNotificationEl().className = "notification severity-urgent fade-in";
    }
  }, 1000);
}

export function stopCountdown(): void {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

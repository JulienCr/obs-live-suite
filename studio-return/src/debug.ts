const MAX_LINES = 20;

let debugEl: HTMLElement | null = null;

export function initDebug(): void {
  debugEl = document.getElementById("debug");
}

export function debugLog(msg: string): void {
  console.log(`[StudioReturn] ${msg}`);

  if (!window.__DEBUG__ || !debugEl) return;

  debugEl.style.display = "block";
  debugEl.textContent =
    `${new Date().toLocaleTimeString()} ${msg}\n` + debugEl.textContent;

  const lines = debugEl.textContent!.split("\n");
  if (lines.length > MAX_LINES) {
    debugEl.textContent = lines.slice(0, MAX_LINES).join("\n");
  }
}

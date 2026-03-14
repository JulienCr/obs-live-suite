const MAX_LINES = 20;
const lines: string[] = [];

let debugEl: HTMLElement | null = null;

export function initDebug(): void {
  debugEl = document.getElementById("debug");
}

export function debugLog(msg: string): void {
  console.log(`[StudioReturn] ${msg}`);

  if (!window.__DEBUG__ || !debugEl) return;

  debugEl.style.display = "block";
  lines.unshift(`${new Date().toLocaleTimeString()} ${msg}`);
  if (lines.length > MAX_LINES) {
    lines.length = MAX_LINES;
  }
  debugEl.textContent = lines.join("\n");
}

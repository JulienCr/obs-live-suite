const MAX_LINES = 20;
const lines: string[] = [];

let debugEl: HTMLElement | null = null;

export function initDebug(): void {
  // Auto-enable debug in Vite dev mode (no need to wait for Rust __DEBUG__ flag)
  if (import.meta.env.DEV) {
    window.__DEBUG__ = true;
  }

  debugEl = document.getElementById("debug");
  if (debugEl) {
    debugEl.style.cursor = "pointer";
    debugEl.addEventListener("click", () => {
      if (lines.length === 0) return;
      navigator.clipboard.writeText(lines.join("\n")).then(() => {
        if (!debugEl) return;
        const prev = debugEl.style.outline;
        debugEl.style.outline = "2px solid lime";
        setTimeout(() => { debugEl!.style.outline = prev; }, 300);
      }).catch(() => {
        // Clipboard API may not be available in Tauri webview
      });
    });
  }
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

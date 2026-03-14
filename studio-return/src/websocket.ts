import type { WSMessage, CuePayload } from "./types";
import { debugLog } from "./debug";

const MAX_RECONNECT_DELAY = 30_000;
const DEFAULT_PORT = 3003;

let ws: WebSocket | null = null;
let wsUrls: string[] = [];
let wsUrlIndex = 0;
let reconnectDelay = 1000;
let messageHandler: ((payload: CuePayload) => void) | null = null;
let started = false;

function buildUrls(port: number): string[] {
  return [
    `wss://localhost:${port}`,
    `ws://localhost:${port}`,
    `ws://127.0.0.1:${port}`,
  ];
}

export function onPresenterMessage(
  handler: (payload: CuePayload) => void,
): void {
  messageHandler = handler;
}

/**
 * Set the WS port (called by Tauri backend via __setWsPort).
 * If already connected on the same port, does nothing.
 * If port changed or not yet connected, (re)connects.
 */
export function setWsPort(port: number): void {
  const newUrls = buildUrls(port);

  // Already connected on this port — skip
  if (started && wsUrls[0] === newUrls[0]) return;

  debugLog(`WS port set to ${port}`);
  wsUrls = newUrls;
  wsUrlIndex = 0;
  reconnectDelay = 1000;

  // Close existing connection if any
  if (ws) {
    ws.onclose = null; // prevent reconnect loop
    ws.close(1000, "port changed");
    ws = null;
  }

  started = true;
  connect();
}

/**
 * Start with default port (fallback if backend is unreachable).
 */
export function connectWithDefault(): void {
  if (started) return;
  wsUrls = buildUrls(DEFAULT_PORT);
  started = true;
  connect();
}

function connect(): void {
  const url = wsUrls[wsUrlIndex];
  debugLog(`Connecting to ${url} (${wsUrlIndex + 1}/${wsUrls.length})...`);

  try {
    ws = new WebSocket(url);
  } catch (e) {
    debugLog(`WebSocket creation failed: ${e}`);
    tryNextUrl();
    return;
  }

  ws.onopen = () => {
    debugLog(`Connected to ${url}`);
    reconnectDelay = 1000;

    // Lock to this working URL
    wsUrls = [url];
    wsUrlIndex = 0;

    ws!.send(JSON.stringify({ type: "subscribe", channel: "presenter" }));
  };

  ws.onmessage = (event: MessageEvent) => {
    try {
      const msg: WSMessage = JSON.parse(event.data as string);

      if (msg.channel !== "presenter") return;

      const data = msg.data;
      if (!data || data.type !== "message") return;

      const payload = data.payload;
      if (!payload || payload.type === "clear") return;
      if (!payload.studioReturn) return;

      messageHandler?.(payload);
    } catch (e) {
      debugLog(`Parse error: ${e}`);
    }
  };

  ws.onerror = () => {
    debugLog("WebSocket error");
  };

  ws.onclose = (event: CloseEvent) => {
    debugLog(`WebSocket closed: code=${event.code}`);
    ws = null;

    if (event.code !== 1000 && event.code !== 1001) {
      tryNextUrl();
    }
  };
}

function tryNextUrl(): void {
  if (wsUrlIndex < wsUrls.length - 1) {
    wsUrlIndex++;
    connect();
  } else {
    wsUrlIndex = 0;
    debugLog(`Reconnecting in ${reconnectDelay}ms...`);
    setTimeout(() => {
      reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY);
      connect();
    }, reconnectDelay);
  }
}

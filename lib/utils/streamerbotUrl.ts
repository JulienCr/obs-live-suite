/**
 * Streamer.bot URL parsing and building utilities.
 * Converts between a single URL string and individual connection fields.
 */

interface StreamerbotUrlParts {
  host: string;
  port: number;
  endpoint: string;
  scheme: "ws" | "wss";
}

const DEFAULTS: StreamerbotUrlParts = {
  host: "127.0.0.1",
  port: 8080,
  endpoint: "/",
  scheme: "ws",
};

/**
 * Build a WebSocket URL from individual connection parts.
 * e.g. { host: "127.0.0.1", port: 8080, endpoint: "/", scheme: "ws" } → "ws://127.0.0.1:8080/"
 */
export function buildStreamerbotUrl(parts: Partial<StreamerbotUrlParts>): string {
  const scheme = parts.scheme ?? DEFAULTS.scheme;
  const host = parts.host || DEFAULTS.host;
  const port = parts.port ?? DEFAULTS.port;
  const endpoint = parts.endpoint || DEFAULTS.endpoint;

  return `${scheme}://${host}:${port}${endpoint}`;
}

/**
 * Parse a WebSocket URL into individual connection parts.
 * e.g. "ws://127.0.0.1:8080/" → { host: "127.0.0.1", port: 8080, endpoint: "/", scheme: "ws" }
 *
 * Uses URL constructor with http:// swap since URL doesn't support ws:// natively.
 */
export function parseStreamerbotUrl(url: string): StreamerbotUrlParts {
  const trimmed = url.trim();
  if (!trimmed) return { ...DEFAULTS };

  // Determine scheme from prefix
  let scheme: "ws" | "wss" = DEFAULTS.scheme;
  let httpUrl = trimmed;

  if (trimmed.startsWith("wss://")) {
    scheme = "wss";
    httpUrl = "https://" + trimmed.slice(6);
  } else if (trimmed.startsWith("ws://")) {
    scheme = "ws";
    httpUrl = "http://" + trimmed.slice(5);
  } else {
    // No scheme prefix - prepend http:// for parsing
    httpUrl = "http://" + trimmed;
  }

  const parsed = new URL(httpUrl);
  const host = parsed.hostname || DEFAULTS.host;
  const endpoint = parsed.pathname || DEFAULTS.endpoint;

  // URL constructor strips default ports (80 for http, 443 for https).
  // Extract port from the original URL string when parsed.port is empty.
  let port = DEFAULTS.port;
  if (parsed.port) {
    port = parseInt(parsed.port, 10);
  } else {
    const portMatch = trimmed.match(/:(\d+)(\/|$)/);
    if (portMatch) {
      port = parseInt(portMatch[1], 10);
    }
  }

  return { host, port, endpoint, scheme };
}

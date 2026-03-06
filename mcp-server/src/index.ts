// Accept self-signed certificates (mkcert) before any imports that may fetch
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerAllTools } from './tools/index.js';
import { MCP_PORT, MCP_HOST, MCP_SERVER_NAME, MCP_SERVER_VERSION } from './config.js';

const app = express();
app.use(express.json());

const LOCAL_IP_RE = /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.).*:[0-9]+$/;
const LOCAL_HOSTNAME_RE = /^https?:\/\/[a-zA-Z][a-zA-Z0-9-]*:[0-9]+$/;

// CORS for local network access
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isLocalOrigin = origin && (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('https://localhost:') ||
    LOCAL_IP_RE.test(origin) ||
    LOCAL_HOSTNAME_RE.test(origin)
  );
  if (isLocalOrigin) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, mcp-session-id');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

function createConfiguredServer() {
  const server = new McpServer({
    name: MCP_SERVER_NAME,
    version: MCP_SERVER_VERSION,
  });
  registerAllTools(server);
  return server;
}

// Stateless MCP endpoint — new server+transport per request (SDK requirement for stateless mode)
app.post('/mcp', async (req, res) => {
  const server = createConfiguredServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } finally {
    await server.close();
  }
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION });
});

// Debug endpoint - test fetch connectivity (dev only)
if (process.env.NODE_ENV !== 'production') {
app.get('/debug/fetch', async (_req, res) => {
  const { FRONTEND_URL, BACKEND_URL } = await import('./config.js');
  const results: Record<string, unknown> = {
    FRONTEND_URL,
    BACKEND_URL,
    NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
    NODE_ENV: process.env.NODE_ENV,
  };
  try {
    const r = await fetch(`${FRONTEND_URL}/api/assets/guests`, { signal: AbortSignal.timeout(5000) });
    results.frontendFetch = { ok: r.ok, status: r.status };
  } catch (e) {
    const err = e as Error;
    results.frontendFetch = { error: err.message, cause: (err as NodeJS.ErrnoException).cause };
  }
  try {
    const r = await fetch(`${BACKEND_URL}/api/overlays`, { signal: AbortSignal.timeout(5000) });
    results.backendFetch = { ok: r.ok, status: r.status };
  } catch (e) {
    const err = e as Error;
    results.backendFetch = { error: err.message, cause: (err as NodeJS.ErrnoException).cause };
  }
  res.json(results);
});
}

app.listen(MCP_PORT, MCP_HOST, () => {
  console.log(`MCP server listening on http://${MCP_HOST}:${MCP_PORT}/mcp`);
});

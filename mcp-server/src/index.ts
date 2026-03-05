import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { registerAllTools } from './tools/index.js';
import { MCP_PORT, MCP_HOST } from './config.js';

const app = express();
app.use(express.json());

// CORS for local network access
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const isLocalOrigin = origin && (
    origin.startsWith('http://localhost:') ||
    origin.startsWith('https://localhost:') ||
    /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.).*:[0-9]+$/.test(origin) ||
    /^https?:\/\/[a-zA-Z][a-zA-Z0-9-]*:[0-9]+$/.test(origin)
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
    name: 'obs-live-suite',
    version: '0.1.0',
  });
  registerAllTools(server);
  return server;
}

// Stateless MCP endpoint
app.post('/mcp', async (req, res) => {
  const server = createConfiguredServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', name: 'obs-live-suite-mcp', version: '0.1.0' });
});

app.listen(MCP_PORT, MCP_HOST, () => {
  console.log(`MCP server listening on http://${MCP_HOST}:${MCP_PORT}/mcp`);
});

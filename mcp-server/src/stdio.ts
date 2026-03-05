import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerAllTools } from './tools/index.js';
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from './config.js';

const server = new McpServer({
  name: MCP_SERVER_NAME,
  version: MCP_SERVER_VERSION,
});

registerAllTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);

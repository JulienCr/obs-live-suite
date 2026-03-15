import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { backendFetch, errorResponse, textResponse } from '../httpClient.js';

export function registerClearAllTools(server: McpServer) {
  server.registerTool('clear-all-overlays', {
    title: 'Clear All Overlays',
    description: 'Panic button: immediately hide all active overlays (lower third, countdown, poster, etc.).',
    inputSchema: z.object({}),
  }, async () => {
    const result = await backendFetch('/api/overlays/clear-all', { method: 'POST' });
    if (!result.success) return errorResponse(result.error);
    return textResponse('All overlays cleared.');
  });

  server.registerTool('reload-overlays', {
    title: 'Reload Overlays',
    description: 'Force-reload all overlay browser sources (lower third, countdown, poster, quiz, chat highlight). Useful when OBS browser sources are stuck on an old version.',
    inputSchema: z.object({}),
  }, async () => {
    const result = await backendFetch('/api/overlays/reload', { method: 'POST' });
    if (!result.success) return errorResponse(result.error);
    return textResponse('All overlay pages reloaded.');
  });
}

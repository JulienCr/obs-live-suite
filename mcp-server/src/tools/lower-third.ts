import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { backendFetch, errorResponse, textResponse } from '../httpClient.js';

export function registerLowerThirdTools(server: McpServer) {
  server.registerTool('show-lower-third-text', {
    title: 'Show Lower Third (Text)',
    description: 'Display a text lower third overlay with title and/or body text. Use for announcements, topic cards, or free-form text overlays.',
    inputSchema: z.object({
      title: z.string().optional().describe('Main title text'),
      body: z.string().optional().describe('Body/subtitle text'),
      side: z.enum(['left', 'right', 'center']).optional().describe('Position on screen (default: left)'),
      duration: z.number().positive().int().optional().describe('Auto-hide after N seconds'),
    }),
  }, async (input) => {
    const result = await backendFetch('/api/overlays/lower', {
      method: 'POST',
      body: JSON.stringify({
        action: 'show',
        payload: { contentType: 'text', ...input },
      }),
    });
    if (!result.success) return errorResponse(result.error ?? 'Unknown error');
    return textResponse('Lower third (text) displayed.');
  });

  server.registerTool('show-lower-third-guest', {
    title: 'Show Lower Third (Guest)',
    description: 'Display a lower third overlay for a registered guest. Uses the guest\'s name, subtitle, avatar, and accent color.',
    inputSchema: z.object({
      guestId: z.string().uuid().describe('Guest ID to display'),
      side: z.enum(['left', 'right', 'center']).optional().describe('Position on screen (default: left)'),
      duration: z.number().positive().int().optional().describe('Auto-hide after N seconds'),
    }),
  }, async (input) => {
    const result = await backendFetch('/api/overlays/lower', {
      method: 'POST',
      body: JSON.stringify({
        action: 'show',
        payload: { contentType: 'guest', ...input },
      }),
    });
    if (!result.success) return errorResponse(result.error ?? 'Unknown error');
    return textResponse('Lower third (guest) displayed.');
  });

  server.registerTool('hide-lower-third', {
    title: 'Hide Lower Third',
    description: 'Hide the currently displayed lower third overlay.',
    inputSchema: z.object({}),
  }, async () => {
    const result = await backendFetch('/api/overlays/lower', {
      method: 'POST',
      body: JSON.stringify({ action: 'hide' }),
    });
    if (!result.success) return errorResponse(result.error ?? 'Unknown error');
    return textResponse('Lower third hidden.');
  });
}

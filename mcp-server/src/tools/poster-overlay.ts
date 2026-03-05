import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { backendFetch } from '../httpClient.js';

export function registerPosterOverlayTools(server: McpServer) {
  server.registerTool('show-poster-overlay', {
    title: 'Show Poster Overlay',
    description: 'Display a poster (image, video, or YouTube) as a full-screen overlay in OBS. Provide fileUrl directly or use a poster from the library.',
    inputSchema: z.object({
      fileUrl: z.string().describe('URL or path of the media to display'),
      posterId: z.string().uuid().optional().describe('Poster ID from library (optional)'),
      type: z.enum(['image', 'video', 'youtube']).optional().describe('Media type (auto-detected if omitted)'),
      transition: z.enum(['fade', 'slide', 'cut', 'blur-sm']).optional().describe('Transition effect (default: fade)'),
      duration: z.number().positive().int().optional().describe('Auto-hide after N seconds (images only)'),
      side: z.enum(['left', 'right']).optional().describe('Side for slide transition'),
      startTime: z.number().min(0).optional().describe('Start time in seconds (videos)'),
      endTime: z.number().min(0).optional().describe('End time in seconds (videos)'),
      endBehavior: z.enum(['stop', 'loop']).optional().describe('What happens at end time'),
      bigPicture: z.boolean().optional().describe('Use big picture overlay mode (default: false)'),
    }),
  }, async ({ bigPicture, ...payload }) => {
    const endpoint = bigPicture ? '/api/overlays/poster-bigpicture' : '/api/overlays/poster';
    const result = await backendFetch(endpoint, {
      method: 'POST',
      body: JSON.stringify({ action: 'show', payload }),
    });
    if (!result.success) {
      return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text: 'Poster overlay displayed.' }] };
  });

  server.registerTool('hide-poster-overlay', {
    title: 'Hide Poster Overlay',
    description: 'Hide the currently displayed poster overlay.',
    inputSchema: z.object({}),
  }, async () => {
    const result = await backendFetch('/api/overlays/poster', {
      method: 'POST',
      body: JSON.stringify({ action: 'hide' }),
    });
    if (!result.success) {
      return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text: 'Poster overlay hidden.' }] };
  });

  server.registerTool('poster-overlay-play', {
    title: 'Play Poster Video',
    description: 'Resume playback of a paused video/YouTube poster overlay.',
    inputSchema: z.object({}),
  }, async () => {
    const result = await backendFetch('/api/overlays/poster', {
      method: 'POST',
      body: JSON.stringify({ action: 'play' }),
    });
    if (!result.success) {
      return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text: 'Poster video playing.' }] };
  });

  server.registerTool('poster-overlay-pause', {
    title: 'Pause Poster Video',
    description: 'Pause playback of a video/YouTube poster overlay.',
    inputSchema: z.object({}),
  }, async () => {
    const result = await backendFetch('/api/overlays/poster', {
      method: 'POST',
      body: JSON.stringify({ action: 'pause' }),
    });
    if (!result.success) {
      return { content: [{ type: 'text' as const, text: `Error: ${result.error}` }], isError: true };
    }
    return { content: [{ type: 'text' as const, text: 'Poster video paused.' }] };
  });
}

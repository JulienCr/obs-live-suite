import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { frontendFetch, errorResponse, jsonResponse } from '../httpClient.js';

export function registerSubvideoTools(server: McpServer) {
  server.registerTool('list-subvideos', {
    title: 'List Sub-Videos',
    description: 'List sub-video clips for a parent poster (video or YouTube). Returns clips with time ranges.',
    inputSchema: z.object({
      posterId: z.string().uuid().describe('Parent poster ID'),
    }),
  }, async ({ posterId }) => {
    const result = await frontendFetch(`/api/assets/posters/${posterId}/subvideos`);
    if (!result.success) return errorResponse(result.error ?? 'Unknown error');
    return jsonResponse(result.data);
  });

  server.registerTool('create-subvideo', {
    title: 'Create Sub-Video',
    description: 'Create a sub-video clip from a parent poster. Defines a time range within the parent video.',
    inputSchema: z.object({
      posterId: z.string().uuid().describe('Parent poster ID (must be video or youtube type)'),
      title: z.string().min(1).max(200).describe('Sub-video clip title'),
      startTime: z.number().min(0).describe('Start time in seconds'),
      endTime: z.number().min(0).describe('End time in seconds (must be > startTime)'),
      endBehavior: z.enum(['stop', 'loop']).describe('What happens when clip ends'),
      thumbnailUrl: z.string().optional().describe('Optional thumbnail URL'),
    }),
  }, async ({ posterId, ...fields }) => {
    const result = await frontendFetch(`/api/assets/posters/${posterId}/subvideos`, {
      method: 'POST',
      body: JSON.stringify(fields),
    });
    if (!result.success) return errorResponse(result.error ?? 'Unknown error');
    return jsonResponse(result.data);
  });
}

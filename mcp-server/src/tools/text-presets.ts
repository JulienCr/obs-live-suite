import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { frontendFetch, errorResponse, textResponse, jsonResponse } from '../httpClient.js';

export function registerTextPresetTools(server: McpServer) {
  server.registerTool('list-text-presets', {
    title: 'List Text Presets',
    description: 'List all saved text presets (quick lower thirds). Optionally filter by enabled status.',
    inputSchema: z.object({
      enabled: z.boolean().optional().describe('Filter by enabled status'),
    }),
  }, async ({ enabled }) => {
    const query = enabled !== undefined ? `?enabled=${enabled}` : '';
    const result = await frontendFetch(`/api/assets/text-presets${query}`);
    if (!result.success) return errorResponse(result.error);
    return jsonResponse(result.data);
  });

  server.registerTool('create-text-preset', {
    title: 'Create Text Preset',
    description: 'Create a saved text preset (quick lower third) with a name and body text. Can be shown later as a lower third overlay.',
    inputSchema: z.object({
      name: z.string().min(1).max(100).describe('Preset name (displayed as title in lower third)'),
      body: z.string().min(1).max(2000).describe('Body text for the lower third'),
      side: z.enum(['left', 'right', 'center']).optional().describe('Position on screen (default: left)'),
      imageUrl: z.string().optional().describe('Optional image URL'),
      imageAlt: z.string().max(200).optional().describe('Optional image alt text'),
      isEnabled: z.boolean().optional().describe('Whether preset is enabled (default: true)'),
    }),
  }, async (input) => {
    const result = await frontendFetch('/api/assets/text-presets', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (!result.success) return errorResponse(result.error);
    return jsonResponse(result.data);
  });

  server.registerTool('update-text-preset', {
    title: 'Update Text Preset',
    description: 'Update an existing text preset by ID. Only provided fields are updated.',
    inputSchema: z.object({
      id: z.string().uuid().describe('Text preset ID'),
      name: z.string().min(1).max(100).optional().describe('Preset name'),
      body: z.string().min(1).max(2000).optional().describe('Body text'),
      side: z.enum(['left', 'right', 'center']).optional().describe('Position on screen'),
      imageUrl: z.string().optional().describe('Image URL'),
      imageAlt: z.string().max(200).optional().describe('Image alt text'),
      isEnabled: z.boolean().optional().describe('Whether preset is enabled'),
    }),
  }, async ({ id, ...fields }) => {
    const result = await frontendFetch(`/api/assets/text-presets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
    if (!result.success) return errorResponse(result.error);
    return jsonResponse(result.data);
  });

  server.registerTool('delete-text-preset', {
    title: 'Delete Text Preset',
    description: 'Delete a text preset by ID.',
    inputSchema: z.object({
      id: z.string().uuid().describe('Text preset ID to delete'),
    }),
  }, async ({ id }) => {
    const result = await frontendFetch(`/api/assets/text-presets/${id}`, { method: 'DELETE' });
    if (!result.success) return errorResponse(result.error);
    return textResponse('Text preset deleted successfully.');
  });

  server.registerTool('show-text-preset', {
    title: 'Show Text Preset',
    description: 'Display a saved text preset as a lower third overlay. Uses the preset\'s name, body, side, and image.',
    inputSchema: z.object({
      id: z.string().uuid().describe('Text preset ID to display'),
      duration: z.number().positive().int().optional().describe('Override auto-hide duration in seconds'),
    }),
  }, async ({ id, duration }) => {
    const body = duration ? { duration } : {};
    const result = await frontendFetch(`/api/actions/lower/text-preset/${id}`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!result.success) return errorResponse(result.error);
    return jsonResponse(result.data);
  });
}

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { frontendFetch, errorResponse, textResponse, jsonResponse } from '../httpClient.js';

/**
 * If downloadToLocal is true and fileUrl is an external URL (not YouTube),
 * download the media to local storage first via the download-upload endpoint.
 */
async function maybeDownloadToLocal(
  fileUrl: string,
  type: string | undefined,
  downloadToLocal: boolean | undefined,
): Promise<{ fileUrl: string; error?: string }> {
  if (!downloadToLocal) return { fileUrl };
  if (type === 'youtube') return { fileUrl };
  // Skip if already a local path
  if (fileUrl.startsWith('/data/') || fileUrl.startsWith('/uploads/')) return { fileUrl };

  const result = await frontendFetch<{ url: string }>('/api/assets/download-upload', {
    method: 'POST',
    body: JSON.stringify({ url: fileUrl }),
  });
  if (!result.success) {
    return { fileUrl, error: `Failed to download media to local storage: ${result.error}` };
  }
  return { fileUrl: result.data!.url };
}

export function registerPosterTools(server: McpServer) {
  server.registerTool('list-posters', {
    title: 'List Posters',
    description: 'List all posters (images, videos, YouTube). Optionally filter by enabled status.',
    inputSchema: z.object({
      enabled: z.boolean().optional().describe('Filter by enabled status'),
    }),
  }, async ({ enabled }) => {
    const query = enabled !== undefined ? `?enabled=${enabled}` : '';
    const result = await frontendFetch(`/api/assets/posters${query}`);
    if (!result.success) return errorResponse(result.error ?? 'Unknown error');
    return jsonResponse(result.data);
  });

  server.registerTool('create-poster', {
    title: 'Create Poster',
    description: 'Create a new poster (image, video, or YouTube). For YouTube, provide the YouTube URL as fileUrl. For images/videos, provide a URL — set downloadToLocal=true to store the file on the server.',
    inputSchema: z.object({
      title: z.string().min(1).max(200).describe('Poster title'),
      fileUrl: z.string().describe('Media URL (external URL, YouTube URL, or local path)'),
      type: z.enum(['image', 'video', 'youtube']).describe('Media type'),
      description: z.string().optional().describe('Poster description'),
      source: z.string().optional().describe('Source attribution'),
      duration: z.number().positive().int().optional().describe('Duration in seconds (for videos)'),
      tags: z.array(z.string()).optional().describe('Tags for categorization'),
      chatMessage: z.string().max(500).optional().describe('Chat message when poster is shown'),
      isEnabled: z.boolean().optional().describe('Whether poster is enabled (default: true)'),
      downloadToLocal: z.boolean().optional().describe('Download external image/video to local storage (default: false). Ignored for YouTube.'),
    }),
  }, async ({ downloadToLocal, ...input }) => {
    const resolved = await maybeDownloadToLocal(input.fileUrl, input.type, downloadToLocal);
    if (resolved.error) return errorResponse(resolved.error);

    const result = await frontendFetch('/api/assets/posters', {
      method: 'POST',
      body: JSON.stringify({ ...input, fileUrl: resolved.fileUrl }),
    });
    if (!result.success) return errorResponse(result.error ?? 'Unknown error');
    return jsonResponse(result.data);
  });

  server.registerTool('update-poster', {
    title: 'Update Poster',
    description: 'Update an existing poster by ID. Only provided fields are updated.',
    inputSchema: z.object({
      id: z.string().uuid().describe('Poster ID'),
      title: z.string().min(1).max(200).optional().describe('Poster title'),
      fileUrl: z.string().optional().describe('Media URL or local path'),
      type: z.enum(['image', 'video', 'youtube']).optional().describe('Media type'),
      description: z.string().optional().describe('Poster description'),
      source: z.string().optional().describe('Source attribution'),
      duration: z.number().positive().int().optional().describe('Duration in seconds'),
      tags: z.array(z.string()).optional().describe('Tags'),
      chatMessage: z.string().max(500).optional().describe('Chat message'),
      isEnabled: z.boolean().optional().describe('Whether poster is enabled'),
      downloadToLocal: z.boolean().optional().describe('Download external image/video to local storage'),
    }),
  }, async ({ id, downloadToLocal, ...fields }) => {
    if (fields.fileUrl && downloadToLocal) {
      const resolved = await maybeDownloadToLocal(fields.fileUrl, fields.type, true);
      if (resolved.error) return errorResponse(resolved.error);
      fields.fileUrl = resolved.fileUrl;
    }

    const result = await frontendFetch(`/api/assets/posters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
    if (!result.success) return errorResponse(result.error ?? 'Unknown error');
    return jsonResponse(result.data);
  });

  server.registerTool('delete-poster', {
    title: 'Delete Poster',
    description: 'Delete a poster by ID.',
    inputSchema: z.object({
      id: z.string().uuid().describe('Poster ID to delete'),
    }),
  }, async ({ id }) => {
    const result = await frontendFetch(`/api/assets/posters/${id}`, { method: 'DELETE' });
    if (!result.success) return errorResponse(result.error ?? 'Unknown error');
    return textResponse('Poster deleted successfully.');
  });
}

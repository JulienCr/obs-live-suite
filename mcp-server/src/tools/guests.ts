import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { frontendFetch, uploadImage, errorResponse, textResponse, jsonResponse } from '../httpClient.js';

const GUEST_UPLOAD_PATH = '/api/assets/guests/upload';

async function resolveAvatarUrl(
  avatarBase64?: string,
  avatarMimeType?: string,
  avatarImageUrl?: string,
): Promise<{ avatarUrl?: string; error?: string }> {
  if (!avatarBase64 && !avatarImageUrl) return {};

  const source = avatarBase64
    ? { base64: avatarBase64, mimeType: avatarMimeType }
    : { url: avatarImageUrl! };

  const upload = await uploadImage(GUEST_UPLOAD_PATH, source);
  if (!upload.success) {
    return { error: `Avatar upload failed: ${upload.error}` };
  }
  return { avatarUrl: upload.data!.url };
}

const avatarFields = {
  avatarBase64: z.string().optional().describe('Base64-encoded avatar image (alternative to avatarImageUrl)'),
  avatarMimeType: z.string().optional().describe('MIME type for base64 image (default: image/jpeg). E.g. image/png'),
  avatarImageUrl: z.string().optional().describe('URL of an avatar image to download (alternative to avatarBase64)'),
};

export function registerGuestTools(server: McpServer) {
  server.registerTool('list-guests', {
    title: 'List Guests',
    description: 'List all guests. Optionally filter by enabled status.',
    inputSchema: z.object({
      enabled: z.boolean().optional().describe('Filter by enabled status'),
    }),
  }, async ({ enabled }) => {
    const query = enabled !== undefined ? `?enabled=${enabled}` : '';
    const result = await frontendFetch(`/api/assets/guests${query}`);
    if (!result.success) return errorResponse(result.error);
    return jsonResponse(result.data);
  });

  server.registerTool('create-guest', {
    title: 'Create Guest',
    description: 'Create a new guest with display name and optional details. Supports avatar upload via base64 or image URL.',
    inputSchema: z.object({
      displayName: z.string().min(1).max(100).describe('Guest display name'),
      subtitle: z.string().max(200).optional().describe('Subtitle or role'),
      accentColor: z.string().optional().describe('Hex color (e.g. #3b82f6)'),
      chatMessage: z.string().max(500).optional().describe('Chat message to send when guest appears'),
      isEnabled: z.boolean().optional().describe('Whether guest is enabled (default: true)'),
      ...avatarFields,
    }),
  }, async ({ avatarBase64, avatarMimeType, avatarImageUrl, ...input }) => {
    const avatar = await resolveAvatarUrl(avatarBase64, avatarMimeType, avatarImageUrl);
    if (avatar.error) return errorResponse(avatar.error);

    const body = { ...input, ...(avatar.avatarUrl ? { avatarUrl: avatar.avatarUrl } : {}) };
    const result = await frontendFetch('/api/assets/guests', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!result.success) return errorResponse(result.error);
    return jsonResponse(result.data);
  });

  server.registerTool('update-guest', {
    title: 'Update Guest',
    description: 'Update an existing guest by ID. Only provided fields are updated. Supports avatar upload via base64 or image URL.',
    inputSchema: z.object({
      id: z.string().uuid().describe('Guest ID'),
      displayName: z.string().min(1).max(100).optional().describe('Guest display name'),
      subtitle: z.string().max(200).optional().describe('Subtitle or role'),
      accentColor: z.string().optional().describe('Hex color'),
      chatMessage: z.string().max(500).optional().describe('Chat message'),
      isEnabled: z.boolean().optional().describe('Whether guest is enabled'),
      ...avatarFields,
    }),
  }, async ({ id, avatarBase64, avatarMimeType, avatarImageUrl, ...fields }) => {
    const avatar = await resolveAvatarUrl(avatarBase64, avatarMimeType, avatarImageUrl);
    if (avatar.error) return errorResponse(avatar.error);

    const body = { ...fields, ...(avatar.avatarUrl ? { avatarUrl: avatar.avatarUrl } : {}) };
    const result = await frontendFetch(`/api/assets/guests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    if (!result.success) return errorResponse(result.error);
    return jsonResponse(result.data);
  });

  server.registerTool('delete-guest', {
    title: 'Delete Guest',
    description: 'Delete a guest by ID.',
    inputSchema: z.object({
      id: z.string().uuid().describe('Guest ID to delete'),
    }),
  }, async ({ id }) => {
    const result = await frontendFetch(`/api/assets/guests/${id}`, { method: 'DELETE' });
    if (!result.success) return errorResponse(result.error);
    return textResponse('Guest deleted successfully.');
  });
}

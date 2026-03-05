import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { backendFetch, errorResponse, textResponse, jsonResponse } from '../httpClient.js';

export function registerChatTools(server: McpServer) {
  server.registerTool('chat-send', {
    title: 'Send Chat Message',
    description: 'Send a message to Twitch/YouTube/Trovo chat via Streamer.bot. Requires Streamer.bot to be connected.',
    inputSchema: z.object({
      platform: z.enum(['twitch', 'youtube', 'trovo']).describe('Chat platform'),
      message: z.string().min(1).describe('Message to send'),
    }),
  }, async (input) => {
    const result = await backendFetch('/api/streamerbot-chat/send', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (!result.success) return errorResponse(result.error);
    return textResponse('Chat message sent.');
  });

  server.registerTool('chat-status', {
    title: 'Chat Connection Status',
    description: 'Check the Streamer.bot chat connection status.',
    inputSchema: z.object({}),
  }, async () => {
    const result = await backendFetch('/api/streamerbot-chat/status');
    if (!result.success) return errorResponse(result.error);
    return jsonResponse(result.data);
  });

  server.registerTool('chat-history', {
    title: 'Chat History',
    description: 'Get recent chat message history from Streamer.bot.',
    inputSchema: z.object({}),
  }, async () => {
    const result = await backendFetch('/api/streamerbot-chat/history');
    if (!result.success) return errorResponse(result.error);
    return jsonResponse(result.data);
  });
}

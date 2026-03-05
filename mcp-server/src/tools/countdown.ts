import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { backendFetch, errorResponse, textResponse } from '../httpClient.js';

export function registerCountdownTools(server: McpServer) {
  server.registerTool('countdown-set', {
    title: 'Set Countdown',
    description: 'Set a countdown timer with duration and optional style. Does NOT auto-start — use countdown-start after setting.',
    inputSchema: z.object({
      seconds: z.number().positive().int().describe('Countdown duration in seconds'),
      style: z.enum(['bold', 'corner', 'banner']).optional().describe('Visual style'),
      format: z.enum(['mm:ss', 'hh:mm:ss', 'seconds']).optional().describe('Time display format'),
    }),
  }, async (input) => {
    const result = await backendFetch('/api/overlays/countdown', {
      method: 'POST',
      body: JSON.stringify({ action: 'set', payload: input }),
    });
    if (!result.success) return errorResponse(result.error ?? 'Unknown error');
    return textResponse(`Countdown set to ${input.seconds}s. Use countdown-start to begin.`);
  });

  server.registerTool('countdown-start', {
    title: 'Start Countdown',
    description: 'Start (or resume) the countdown timer.',
    inputSchema: z.object({}),
  }, async () => {
    const result = await backendFetch('/api/overlays/countdown', {
      method: 'POST',
      body: JSON.stringify({ action: 'start' }),
    });
    if (!result.success) return errorResponse(result.error ?? 'Unknown error');
    return textResponse('Countdown started.');
  });

  server.registerTool('countdown-pause', {
    title: 'Pause Countdown',
    description: 'Pause the running countdown timer.',
    inputSchema: z.object({}),
  }, async () => {
    const result = await backendFetch('/api/overlays/countdown', {
      method: 'POST',
      body: JSON.stringify({ action: 'pause' }),
    });
    if (!result.success) return errorResponse(result.error ?? 'Unknown error');
    return textResponse('Countdown paused.');
  });

  server.registerTool('countdown-reset', {
    title: 'Reset Countdown',
    description: 'Reset and hide the countdown timer.',
    inputSchema: z.object({}),
  }, async () => {
    const result = await backendFetch('/api/overlays/countdown', {
      method: 'POST',
      body: JSON.stringify({ action: 'reset' }),
    });
    if (!result.success) return errorResponse(result.error ?? 'Unknown error');
    return textResponse('Countdown reset.');
  });

  server.registerTool('countdown-add-time', {
    title: 'Add Time to Countdown',
    description: 'Add (or subtract) seconds to the running countdown.',
    inputSchema: z.object({
      seconds: z.number().int().describe('Seconds to add (negative to subtract)'),
    }),
  }, async ({ seconds }) => {
    const result = await backendFetch('/api/overlays/countdown', {
      method: 'POST',
      body: JSON.stringify({ action: 'add-time', payload: { seconds } }),
    });
    if (!result.success) return errorResponse(result.error ?? 'Unknown error');
    return textResponse(`Added ${seconds}s to countdown.`);
  });
}

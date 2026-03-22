import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import { backendFetch, errorResponse, textResponse } from '../httpClient.js';

/**
 * Parse markdown into sommaire categories.
 * Lines starting with # become categories, ## become sub-items.
 */
function parseSommaireMarkdown(markdown: string): { index: number; title: string; items: string[] }[] {
  const categories: { index: number; title: string; items: string[] }[] = [];
  let current: { index: number; title: string; items: string[] } | null = null;

  for (const line of markdown.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      if (current) {
        current.items.push(trimmed.slice(3).trim());
      }
    } else if (trimmed.startsWith('# ')) {
      current = {
        index: categories.length,
        title: trimmed.slice(2).trim(),
        items: [],
      };
      categories.push(current);
    }
  }

  return categories;
}

export function registerSommaireTools(server: McpServer) {
  server.registerTool('show-sommaire', {
    title: 'Show Sommaire',
    description: 'Display the sommaire (table of contents) overlay with categories parsed from markdown. Use # for categories and ## for sub-items.',
    inputSchema: z.object({
      markdown: z.string().describe('Markdown text with # for categories and ## for sub-items'),
      activeIndex: z.number().int().min(-1).optional().describe('Index of the category to highlight (-1 or omit for none)'),
    }),
  }, async ({ markdown, activeIndex }) => {
    const categories = parseSommaireMarkdown(markdown);
    if (categories.length === 0) {
      return errorResponse('No categories found in markdown. Use # for categories and ## for sub-items.');
    }

    const result = await backendFetch('/api/overlays/sommaire', {
      method: 'POST',
      body: JSON.stringify({
        action: 'show',
        payload: { categories, activeIndex: activeIndex ?? -1 },
      }),
    });

    if (!result.success) return errorResponse(result.error);
    return textResponse(`Sommaire displayed with ${categories.length} categories.`);
  });

  server.registerTool('hide-sommaire', {
    title: 'Hide Sommaire',
    description: 'Hide the sommaire (table of contents) overlay.',
    inputSchema: z.object({}),
  }, async () => {
    const result = await backendFetch('/api/overlays/sommaire', {
      method: 'POST',
      body: JSON.stringify({ action: 'hide' }),
    });

    if (!result.success) return errorResponse(result.error);
    return textResponse('Sommaire hidden.');
  });

  server.registerTool('highlight-sommaire', {
    title: 'Highlight Sommaire Category',
    description: 'Highlight a specific category or sub-item in the sommaire overlay. Use -1 to clear.',
    inputSchema: z.object({
      activeIndex: z.number().int().min(-1).describe('Index of the category to highlight (0-based), or -1 to clear'),
      activeSubIndex: z.number().int().min(-1).optional().describe('Index of the sub-item within the category (-1 or omit for whole category)'),
    }),
  }, async ({ activeIndex, activeSubIndex }) => {
    const result = await backendFetch('/api/overlays/sommaire', {
      method: 'POST',
      body: JSON.stringify({
        action: 'highlight',
        payload: { activeIndex, activeSubIndex: activeSubIndex ?? -1 },
      }),
    });

    if (!result.success) return errorResponse(result.error);
    if (activeIndex === -1) return textResponse('Sommaire highlight cleared.');
    if (activeSubIndex !== undefined && activeSubIndex >= 0) {
      return textResponse(`Sommaire: category ${activeIndex}, sub-item ${activeSubIndex} highlighted.`);
    }
    return textResponse(`Sommaire: category ${activeIndex} highlighted.`);
  });
}

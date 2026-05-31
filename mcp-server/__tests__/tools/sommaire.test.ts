const mockBackendFetch = jest.fn();
const mockFrontendFetch = jest.fn();
jest.mock('../../src/httpClient', () => ({
  backendFetch: (...args: unknown[]) => mockBackendFetch(...args),
  frontendFetch: (...args: unknown[]) => mockFrontendFetch(...args),
  errorResponse: jest.requireActual('../../src/httpClient').errorResponse,
  textResponse: jest.requireActual('../../src/httpClient').textResponse,
}));

import { registerSommaireTools } from '../../src/tools/sommaire';

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

function createMockServer() {
  const tools = new Map<string, ToolHandler>();
  return {
    registerTool: jest.fn((name: string, _config: unknown, handler: ToolHandler) =>
      tools.set(name, handler),
    ),
    tools,
  };
}

const MARKDOWN = `# ACTE 1\n## Chapitre 1\n## Chapitre 2\n# ACTE 2\n## Chapitre 3`;

describe('sommaire tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerSommaireTools(server as never);
  });

  describe('set-sommaire', () => {
    it('persists markdown then broadcasts a set-markdown event', async () => {
      mockFrontendFetch.mockResolvedValue({ success: true });
      mockBackendFetch.mockResolvedValue({ success: true });

      const handler = server.tools.get('set-sommaire')!;
      const result = await handler({ markdown: MARKDOWN });

      expect(mockFrontendFetch).toHaveBeenCalledWith('/api/settings/sommaire', {
        method: 'POST',
        body: JSON.stringify({ markdown: MARKDOWN }),
      });
      expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/sommaire', {
        method: 'POST',
        body: JSON.stringify({ action: 'set-markdown', payload: { markdown: MARKDOWN } }),
      });
      // 2 categories, 3 sub-items
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: "Sommaire chargé dans le panel : 2 catégorie(s), 3 sous-élément(s). L'opérateur peut le réviser puis cliquer Show.",
          },
        ],
      });
    });

    it('returns an error when markdown has no categories', async () => {
      const handler = server.tools.get('set-sommaire')!;
      const result = await handler({ markdown: 'just some text\nno headings here' });

      expect(mockFrontendFetch).not.toHaveBeenCalled();
      expect(mockBackendFetch).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'Error: No categories found in markdown. Use # for titles and ## for sub-titles.',
          },
        ],
        isError: true,
      });
    });

    it('returns an error and skips broadcast when persistence fails', async () => {
      mockFrontendFetch.mockResolvedValue({ success: false, error: 'DB write failed' });

      const handler = server.tools.get('set-sommaire')!;
      const result = await handler({ markdown: MARKDOWN });

      expect(mockFrontendFetch).toHaveBeenCalled();
      expect(mockBackendFetch).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: DB write failed' }],
        isError: true,
      });
    });
  });

  describe('show-sommaire', () => {
    it('parses markdown and posts categories to the overlay', async () => {
      mockBackendFetch.mockResolvedValue({ success: true });

      const handler = server.tools.get('show-sommaire')!;
      const result = await handler({ markdown: MARKDOWN });

      expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/sommaire', {
        method: 'POST',
        body: JSON.stringify({
          action: 'show',
          payload: {
            categories: [
              { index: 0, title: 'ACTE 1', items: ['Chapitre 1', 'Chapitre 2'] },
              { index: 1, title: 'ACTE 2', items: ['Chapitre 3'] },
            ],
            activeIndex: -1,
          },
        }),
      });
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Sommaire displayed with 2 categories.' }],
      });
    });
  });
});

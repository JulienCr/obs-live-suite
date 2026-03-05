const mockBackendFetch = jest.fn();
jest.mock('../../src/httpClient', () => ({
  backendFetch: (...args: unknown[]) => mockBackendFetch(...args),
  errorResponse: jest.requireActual('../../src/httpClient').errorResponse,
  textResponse: jest.requireActual('../../src/httpClient').textResponse,
}));

import { registerClearAllTools } from '../../src/tools/clear-all';

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

describe('clear-all tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerClearAllTools(server as never);
  });

  it('clear-all-overlays posts to clear-all endpoint and returns confirmation', async () => {
    mockBackendFetch.mockResolvedValue({ success: true });

    const handler = server.tools.get('clear-all-overlays')!;
    const result = await handler({});

    expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/clear-all', { method: 'POST' });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'All overlays cleared.' }],
    });
  });

  it('clear-all-overlays forwards error when backend fetch fails', async () => {
    mockBackendFetch.mockResolvedValue({ success: false, error: 'Connection refused' });

    const handler = server.tools.get('clear-all-overlays')!;
    const result = await handler({});

    expect(result).toEqual({
      content: [{ type: 'text', text: 'Error: Connection refused' }],
      isError: true,
    });
  });
});

const mockBackendFetch = jest.fn();
jest.mock('../../src/httpClient', () => ({
  backendFetch: (...args: unknown[]) => mockBackendFetch(...args),
  errorResponse: jest.requireActual('../../src/httpClient').errorResponse,
  textResponse: jest.requireActual('../../src/httpClient').textResponse,
}));

import { registerLowerThirdTools } from '../../src/tools/lower-third';

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

function createMockServer() {
  const tools = new Map<string, ToolHandler>();
  return {
    registerTool: jest.fn((name: string, _config: unknown, handler: ToolHandler) => tools.set(name, handler)),
    tools,
  };
}

describe('lower-third tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerLowerThirdTools(server as never);
  });

  it('show-lower-third-text posts with contentType text and input fields', async () => {
    mockBackendFetch.mockResolvedValue({ success: true });
    const handler = server.tools.get('show-lower-third-text')!;
    const result = await handler({ title: 'Hello', body: 'World' });

    expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/lower', {
      method: 'POST',
      body: JSON.stringify({
        action: 'show',
        payload: { contentType: 'text', title: 'Hello', body: 'World' },
      }),
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Lower third (text) displayed.' }],
    });
  });

  it('show-lower-third-guest posts with contentType guest and guestId', async () => {
    mockBackendFetch.mockResolvedValue({ success: true });
    const handler = server.tools.get('show-lower-third-guest')!;
    const guestId = '550e8400-e29b-41d4-a716-446655440000';
    const result = await handler({ guestId });

    expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/lower', {
      method: 'POST',
      body: JSON.stringify({
        action: 'show',
        payload: { contentType: 'guest', guestId },
      }),
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Lower third (guest) displayed.' }],
    });
  });

  it('hide-lower-third posts hide action', async () => {
    mockBackendFetch.mockResolvedValue({ success: true });
    const handler = server.tools.get('hide-lower-third')!;
    const result = await handler({});

    expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/lower', {
      method: 'POST',
      body: JSON.stringify({ action: 'hide' }),
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Lower third hidden.' }],
    });
  });

  it('forwards error when backendFetch fails', async () => {
    mockBackendFetch.mockResolvedValue({ success: false, error: 'fail' });
    const handler = server.tools.get('show-lower-third-text')!;
    const result = await handler({ title: 'Test' });

    expect(result).toEqual({
      content: [{ type: 'text', text: 'Error: fail' }],
      isError: true,
    });
  });
});

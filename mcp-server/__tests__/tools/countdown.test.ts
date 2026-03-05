const mockBackendFetch = jest.fn();
jest.mock('../../src/httpClient', () => ({
  backendFetch: (...args: unknown[]) => mockBackendFetch(...args),
  errorResponse: jest.requireActual('../../src/httpClient').errorResponse,
  textResponse: jest.requireActual('../../src/httpClient').textResponse,
}));

import { registerCountdownTools } from '../../src/tools/countdown';

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

describe('countdown tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerCountdownTools(server as never);
  });

  it('countdown-set posts set action with payload and returns confirmation', async () => {
    mockBackendFetch.mockResolvedValue({ success: true });

    const handler = server.tools.get('countdown-set')!;
    const result = await handler({ seconds: 120 });

    expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/countdown', {
      method: 'POST',
      body: JSON.stringify({ action: 'set', payload: { seconds: 120 } }),
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Countdown set to 120s. Use countdown-start to begin.' }],
    });
  });

  it('countdown-start posts start action and returns confirmation', async () => {
    mockBackendFetch.mockResolvedValue({ success: true });

    const handler = server.tools.get('countdown-start')!;
    const result = await handler({});

    expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/countdown', {
      method: 'POST',
      body: JSON.stringify({ action: 'start' }),
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Countdown started.' }],
    });
  });

  it('countdown-pause posts pause action and returns confirmation', async () => {
    mockBackendFetch.mockResolvedValue({ success: true });

    const handler = server.tools.get('countdown-pause')!;
    const result = await handler({});

    expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/countdown', {
      method: 'POST',
      body: JSON.stringify({ action: 'pause' }),
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Countdown paused.' }],
    });
  });

  it('countdown-reset posts reset action and returns confirmation', async () => {
    mockBackendFetch.mockResolvedValue({ success: true });

    const handler = server.tools.get('countdown-reset')!;
    const result = await handler({});

    expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/countdown', {
      method: 'POST',
      body: JSON.stringify({ action: 'reset' }),
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Countdown reset.' }],
    });
  });

  it('countdown-add-time posts add-time action with seconds and returns confirmation', async () => {
    mockBackendFetch.mockResolvedValue({ success: true });

    const handler = server.tools.get('countdown-add-time')!;
    const result = await handler({ seconds: 30 });

    expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/countdown', {
      method: 'POST',
      body: JSON.stringify({ action: 'add-time', payload: { seconds: 30 } }),
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Added 30s to countdown.' }],
    });
  });
});

const mockBackendFetch = jest.fn();
jest.mock('../../src/httpClient', () => ({
  backendFetch: (...args: unknown[]) => mockBackendFetch(...args),
  errorResponse: jest.requireActual('../../src/httpClient').errorResponse,
  textResponse: jest.requireActual('../../src/httpClient').textResponse,
  jsonResponse: jest.requireActual('../../src/httpClient').jsonResponse,
}));

import { registerChatTools } from '../../src/tools/chat';

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

describe('chat tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerChatTools(server as never);
  });

  it('chat-send posts input to /api/streamerbot-chat/send and returns confirmation', async () => {
    mockBackendFetch.mockResolvedValue({ success: true });

    const handler = server.tools.get('chat-send')!;
    const input = { platform: 'twitch', message: 'Hello chat!' };
    const result = await handler(input);

    expect(mockBackendFetch).toHaveBeenCalledWith('/api/streamerbot-chat/send', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Chat message sent.' }],
    });
  });

  it('chat-status fetches connection status and returns json', async () => {
    const statusData = { connected: true, platform: 'twitch' };
    mockBackendFetch.mockResolvedValue({ success: true, data: statusData });

    const handler = server.tools.get('chat-status')!;
    const result = await handler({});

    expect(mockBackendFetch).toHaveBeenCalledWith('/api/streamerbot-chat/status');
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(statusData, null, 2) }],
    });
  });

  it('chat-history fetches message history and returns json', async () => {
    const historyData = [{ user: 'viewer1', message: 'hi' }];
    mockBackendFetch.mockResolvedValue({ success: true, data: historyData });

    const handler = server.tools.get('chat-history')!;
    const result = await handler({});

    expect(mockBackendFetch).toHaveBeenCalledWith('/api/streamerbot-chat/history');
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(historyData, null, 2) }],
    });
  });
});

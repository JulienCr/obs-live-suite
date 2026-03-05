const mockFrontendFetch = jest.fn();
jest.mock('../../src/httpClient', () => ({
  frontendFetch: (...args: unknown[]) => mockFrontendFetch(...args),
  errorResponse: jest.requireActual('../../src/httpClient').errorResponse,
  jsonResponse: jest.requireActual('../../src/httpClient').jsonResponse,
}));

import { registerSubvideoTools } from '../../src/tools/subvideos';

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

describe('subvideo tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerSubvideoTools(server as never);
  });

  it('list-subvideos fetches subvideos for a poster and returns json', async () => {
    const subvideos = [{ id: 'sv1', title: 'Clip 1', startTime: 0, endTime: 30 }];
    const posterId = '550e8400-e29b-41d4-a716-446655440000';
    mockFrontendFetch.mockResolvedValue({ success: true, data: subvideos });

    const handler = server.tools.get('list-subvideos')!;
    const result = await handler({ posterId });

    expect(mockFrontendFetch).toHaveBeenCalledWith(`/api/assets/posters/${posterId}/subvideos`);
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(subvideos, null, 2) }],
    });
  });

  it('create-subvideo posts fields to subvideos endpoint and returns json', async () => {
    const posterId = '550e8400-e29b-41d4-a716-446655440000';
    const fields = { title: 'Intro', startTime: 0, endTime: 15, endBehavior: 'stop' };
    const created = { id: 'sv2', ...fields };
    mockFrontendFetch.mockResolvedValue({ success: true, data: created });

    const handler = server.tools.get('create-subvideo')!;
    const result = await handler({ posterId, ...fields });

    expect(mockFrontendFetch).toHaveBeenCalledWith(`/api/assets/posters/${posterId}/subvideos`, {
      method: 'POST',
      body: JSON.stringify(fields),
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(created, null, 2) }],
    });
  });
});

jest.mock('../../src/config', () => ({
  BACKEND_URL: 'http://localhost:3002',
  FRONTEND_URL: 'http://localhost:3000',
}));

const mockFrontendFetch = jest.fn();
jest.mock('../../src/httpClient', () => ({
  frontendFetch: (...args: unknown[]) => mockFrontendFetch(...args),
  errorResponse: jest.requireActual('../../src/httpClient').errorResponse,
  textResponse: jest.requireActual('../../src/httpClient').textResponse,
  jsonResponse: jest.requireActual('../../src/httpClient').jsonResponse,
}));

import { registerPosterTools } from '../../src/tools/posters';

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

function createMockServer() {
  const tools = new Map<string, ToolHandler>();
  return {
    registerTool: jest.fn((name: string, _config: unknown, handler: ToolHandler) => tools.set(name, handler)),
    tools,
  };
}

let server: ReturnType<typeof createMockServer>;

beforeEach(() => {
  mockFrontendFetch.mockReset();
  server = createMockServer();
  registerPosterTools(server as never);
});

// ---------------------------------------------------------------------------
// list-posters
// ---------------------------------------------------------------------------

describe('list-posters', () => {
  test('no filter calls GET /api/assets/posters without query string', async () => {
    const posters = [{ id: '1', title: 'Poster A' }];
    mockFrontendFetch.mockResolvedValueOnce({ success: true, data: posters });

    const result = await server.tools.get('list-posters')!({ enabled: undefined });

    expect(mockFrontendFetch).toHaveBeenCalledWith('/api/assets/posters');
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(posters, null, 2) }],
    });
  });

  test('enabled=false filter calls GET /api/assets/posters?enabled=false', async () => {
    mockFrontendFetch.mockResolvedValueOnce({ success: true, data: [] });

    await server.tools.get('list-posters')!({ enabled: false });

    expect(mockFrontendFetch).toHaveBeenCalledWith('/api/assets/posters?enabled=false');
  });
});

// ---------------------------------------------------------------------------
// create-poster
// ---------------------------------------------------------------------------

describe('create-poster', () => {
  const basePoster = {
    title: 'My Poster',
    fileUrl: 'https://example.com/image.jpg',
    type: 'image',
  };

  test('no downloadToLocal passes fileUrl through unchanged', async () => {
    const created = { id: 'abc', ...basePoster };
    mockFrontendFetch.mockResolvedValueOnce({ success: true, data: created });

    const result = await server.tools.get('create-poster')!({ ...basePoster });

    expect(mockFrontendFetch).toHaveBeenCalledTimes(1);
    expect(mockFrontendFetch).toHaveBeenCalledWith('/api/assets/posters', {
      method: 'POST',
      body: JSON.stringify(basePoster),
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(created, null, 2) }],
    });
  });

  test('downloadToLocal + external URL calls download-upload first, uses returned URL', async () => {
    mockFrontendFetch
      .mockResolvedValueOnce({ success: true, data: { url: '/uploads/local.jpg' } })
      .mockResolvedValueOnce({ success: true, data: { id: 'abc' } });

    await server.tools.get('create-poster')!({ ...basePoster, downloadToLocal: true });

    expect(mockFrontendFetch).toHaveBeenCalledTimes(2);
    expect(mockFrontendFetch).toHaveBeenNthCalledWith(1, '/api/assets/download-upload', {
      method: 'POST',
      body: JSON.stringify({ url: basePoster.fileUrl }),
    });
    expect(mockFrontendFetch).toHaveBeenNthCalledWith(2, '/api/assets/posters', {
      method: 'POST',
      body: JSON.stringify({ ...basePoster, fileUrl: '/uploads/local.jpg' }),
    });
  });

  test('downloadToLocal + youtube type skips download', async () => {
    const ytPoster = { title: 'YT', fileUrl: 'https://youtube.com/watch?v=abc', type: 'youtube' };
    mockFrontendFetch.mockResolvedValueOnce({ success: true, data: { id: 'yt1' } });

    await server.tools.get('create-poster')!({ ...ytPoster, downloadToLocal: true });

    expect(mockFrontendFetch).toHaveBeenCalledTimes(1);
    expect(mockFrontendFetch).toHaveBeenCalledWith('/api/assets/posters', {
      method: 'POST',
      body: JSON.stringify(ytPoster),
    });
  });

  test('downloadToLocal + local path (/uploads/...) skips download', async () => {
    const localPoster = { title: 'Local', fileUrl: '/uploads/existing.jpg', type: 'image' };
    mockFrontendFetch.mockResolvedValueOnce({ success: true, data: { id: 'loc1' } });

    await server.tools.get('create-poster')!({ ...localPoster, downloadToLocal: true });

    expect(mockFrontendFetch).toHaveBeenCalledTimes(1);
    expect(mockFrontendFetch).toHaveBeenCalledWith('/api/assets/posters', {
      method: 'POST',
      body: JSON.stringify(localPoster),
    });
  });

  test('download fails returns error response', async () => {
    mockFrontendFetch.mockResolvedValueOnce({ success: false, error: 'Not found' });

    const result = await server.tools.get('create-poster')!({ ...basePoster, downloadToLocal: true });

    expect(mockFrontendFetch).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Error: Failed to download media to local storage: Not found' }],
      isError: true,
    });
  });
});

// ---------------------------------------------------------------------------
// update-poster
// ---------------------------------------------------------------------------

describe('update-poster', () => {
  const posterId = '550e8400-e29b-41d4-a716-446655440000';

  test('with downloadToLocal downloads then PATCHes with resolved URL', async () => {
    mockFrontendFetch
      .mockResolvedValueOnce({ success: true, data: { url: '/uploads/new.jpg' } })
      .mockResolvedValueOnce({ success: true, data: { id: posterId } });

    await server.tools.get('update-poster')!({
      id: posterId,
      fileUrl: 'https://example.com/new.jpg',
      type: 'image',
      downloadToLocal: true,
    });

    expect(mockFrontendFetch).toHaveBeenCalledTimes(2);
    expect(mockFrontendFetch).toHaveBeenNthCalledWith(1, '/api/assets/download-upload', {
      method: 'POST',
      body: JSON.stringify({ url: 'https://example.com/new.jpg' }),
    });
    expect(mockFrontendFetch).toHaveBeenNthCalledWith(2, `/api/assets/posters/${posterId}`, {
      method: 'PATCH',
      body: JSON.stringify({ fileUrl: '/uploads/new.jpg', type: 'image' }),
    });
  });

  test('without downloadToLocal just PATCHes with original fileUrl', async () => {
    mockFrontendFetch.mockResolvedValueOnce({ success: true, data: { id: posterId } });

    await server.tools.get('update-poster')!({
      id: posterId,
      fileUrl: 'https://example.com/img.jpg',
      title: 'Updated',
    });

    expect(mockFrontendFetch).toHaveBeenCalledTimes(1);
    expect(mockFrontendFetch).toHaveBeenCalledWith(`/api/assets/posters/${posterId}`, {
      method: 'PATCH',
      body: JSON.stringify({ fileUrl: 'https://example.com/img.jpg', title: 'Updated' }),
    });
  });
});

// ---------------------------------------------------------------------------
// delete-poster
// ---------------------------------------------------------------------------

describe('delete-poster', () => {
  test('returns success text on successful deletion', async () => {
    const posterId = '550e8400-e29b-41d4-a716-446655440000';
    mockFrontendFetch.mockResolvedValueOnce({ success: true });

    const result = await server.tools.get('delete-poster')!({ id: posterId });

    expect(mockFrontendFetch).toHaveBeenCalledWith(`/api/assets/posters/${posterId}`, { method: 'DELETE' });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Poster deleted successfully.' }],
    });
  });
});

const mockBackendFetch = jest.fn();

jest.mock('../../src/httpClient', () => ({
  backendFetch: (...args: unknown[]) => mockBackendFetch(...args),
  errorResponse: jest.requireActual('../../src/httpClient').errorResponse,
  textResponse: jest.requireActual('../../src/httpClient').textResponse,
}));

import { registerPosterOverlayTools } from '../../src/tools/poster-overlay';

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

describe('poster-overlay tools', () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    jest.clearAllMocks();
    server = createMockServer();
    registerPosterOverlayTools(server as any);
  });

  describe('show-poster-overlay', () => {
    it('should POST to /api/overlays/poster when bigPicture is false or undefined', async () => {
      mockBackendFetch.mockResolvedValue({ success: true });

      const handler = server.tools.get('show-poster-overlay')!;
      const result = await handler({ fileUrl: 'http://example.com/image.png', type: 'image' });

      expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/poster', {
        method: 'POST',
        body: JSON.stringify({
          action: 'show',
          payload: { fileUrl: 'http://example.com/image.png', type: 'image' },
        }),
      });
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Poster overlay displayed.' }],
      });
    });

    it('should POST to /api/overlays/poster-bigpicture when bigPicture is true', async () => {
      mockBackendFetch.mockResolvedValue({ success: true });

      const handler = server.tools.get('show-poster-overlay')!;
      await handler({ fileUrl: 'http://example.com/video.mp4', bigPicture: true });

      expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/poster-bigpicture', {
        method: 'POST',
        body: JSON.stringify({
          action: 'show',
          payload: { fileUrl: 'http://example.com/video.mp4' },
        }),
      });
    });

    it('should return error when backendFetch fails', async () => {
      mockBackendFetch.mockResolvedValue({ success: false, error: 'Connection refused' });

      const handler = server.tools.get('show-poster-overlay')!;
      const result = await handler({ fileUrl: 'http://example.com/image.png' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: Connection refused' }],
        isError: true,
      });
    });
  });

  describe('hide-poster-overlay', () => {
    it('should return success when both endpoints succeed', async () => {
      mockBackendFetch.mockResolvedValue({ success: true });

      const handler = server.tools.get('hide-poster-overlay')!;
      const result = await handler({});

      expect(mockBackendFetch).toHaveBeenCalledTimes(2);
      expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/poster', {
        method: 'POST',
        body: JSON.stringify({ action: 'hide' }),
      });
      expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/poster-bigpicture', {
        method: 'POST',
        body: JSON.stringify({ action: 'hide' }),
      });
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Poster overlay hidden.' }],
      });
    });

    it('should return success when one fails and the other succeeds', async () => {
      mockBackendFetch
        .mockResolvedValueOnce({ success: false, error: 'Not found' })
        .mockResolvedValueOnce({ success: true });

      const handler = server.tools.get('hide-poster-overlay')!;
      const result = await handler({});

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Poster overlay hidden.' }],
      });
    });

    it('should return error when both endpoints fail', async () => {
      mockBackendFetch
        .mockResolvedValueOnce({ success: false, error: 'Server down' })
        .mockResolvedValueOnce({ success: false, error: 'Server down' });

      const handler = server.tools.get('hide-poster-overlay')!;
      const result = await handler({});

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: Server down' }],
        isError: true,
      });
    });
  });

  describe('poster-overlay-play', () => {
    it('should POST play action to /api/overlays/poster', async () => {
      mockBackendFetch.mockResolvedValue({ success: true });

      const handler = server.tools.get('poster-overlay-play')!;
      const result = await handler({});

      expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/poster', {
        method: 'POST',
        body: JSON.stringify({ action: 'play' }),
      });
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Poster video playing.' }],
      });
    });

    it('should return error when backendFetch fails', async () => {
      mockBackendFetch.mockResolvedValue({ success: false, error: 'Timeout' });

      const handler = server.tools.get('poster-overlay-play')!;
      const result = await handler({});

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: Timeout' }],
        isError: true,
      });
    });
  });

  describe('poster-overlay-pause', () => {
    it('should POST pause action to /api/overlays/poster', async () => {
      mockBackendFetch.mockResolvedValue({ success: true });

      const handler = server.tools.get('poster-overlay-pause')!;
      const result = await handler({});

      expect(mockBackendFetch).toHaveBeenCalledWith('/api/overlays/poster', {
        method: 'POST',
        body: JSON.stringify({ action: 'pause' }),
      });
      expect(result).toEqual({
        content: [{ type: 'text', text: 'Poster video paused.' }],
      });
    });

    it('should return error when backendFetch fails', async () => {
      mockBackendFetch.mockResolvedValue({ success: false, error: 'Network error' });

      const handler = server.tools.get('poster-overlay-pause')!;
      const result = await handler({});

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: Network error' }],
        isError: true,
      });
    });
  });
});

const mockFrontendFetch = jest.fn();
const mockUploadImage = jest.fn();

jest.mock('../../src/config', () => ({
  BACKEND_URL: 'http://localhost:3002',
  FRONTEND_URL: 'http://localhost:3000',
}));

jest.mock('../../src/httpClient', () => ({
  frontendFetch: (...args: unknown[]) => mockFrontendFetch(...args),
  uploadImage: (...args: unknown[]) => mockUploadImage(...args),
  errorResponse: jest.requireActual('../../src/httpClient').errorResponse,
  textResponse: jest.requireActual('../../src/httpClient').textResponse,
  jsonResponse: jest.requireActual('../../src/httpClient').jsonResponse,
}));

import { registerGuestTools } from '../../src/tools/guests';

type ToolHandler = (args: Record<string, unknown>) => Promise<unknown>;

function createMockServer() {
  const tools = new Map<string, ToolHandler>();
  return {
    registerTool: jest.fn(
      (name: string, _config: unknown, handler: ToolHandler) => tools.set(name, handler),
    ),
    tools,
  };
}

let server: ReturnType<typeof createMockServer>;
let listGuests: ToolHandler;
let createGuest: ToolHandler;
let updateGuest: ToolHandler;
let deleteGuest: ToolHandler;

beforeEach(() => {
  mockFrontendFetch.mockReset();
  mockUploadImage.mockReset();

  server = createMockServer();
  registerGuestTools(server as any);

  listGuests = server.tools.get('list-guests')!;
  createGuest = server.tools.get('create-guest')!;
  updateGuest = server.tools.get('update-guest')!;
  deleteGuest = server.tools.get('delete-guest')!;
});

// ---------------------------------------------------------------------------
// list-guests
// ---------------------------------------------------------------------------

describe('list-guests', () => {
  test('no filter calls /api/assets/guests and returns jsonResponse', async () => {
    const guests = [{ id: '1', displayName: 'Alice' }];
    mockFrontendFetch.mockResolvedValueOnce({ success: true, data: guests });

    const result = await listGuests({});

    expect(mockFrontendFetch).toHaveBeenCalledWith('/api/assets/guests');
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(guests, null, 2) }],
    });
  });

  test('enabled=true appends query string', async () => {
    mockFrontendFetch.mockResolvedValueOnce({ success: true, data: [] });

    await listGuests({ enabled: true });

    expect(mockFrontendFetch).toHaveBeenCalledWith('/api/assets/guests?enabled=true');
  });

  test('error is forwarded as errorResponse', async () => {
    mockFrontendFetch.mockResolvedValueOnce({ success: false, error: 'fail' });

    const result = await listGuests({});

    expect(result).toEqual({
      content: [{ type: 'text', text: 'Error: fail' }],
      isError: true,
    });
  });
});

// ---------------------------------------------------------------------------
// create-guest
// ---------------------------------------------------------------------------

describe('create-guest', () => {
  test('no avatar: POST without uploadImage call', async () => {
    const created = { id: '1', displayName: 'Bob' };
    mockFrontendFetch.mockResolvedValueOnce({ success: true, data: created });

    const result = await createGuest({ displayName: 'Bob', subtitle: 'Host' });

    expect(mockUploadImage).not.toHaveBeenCalled();
    expect(mockFrontendFetch).toHaveBeenCalledWith('/api/assets/guests', {
      method: 'POST',
      body: JSON.stringify({ displayName: 'Bob', subtitle: 'Host' }),
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(created, null, 2) }],
    });
  });

  test('with base64 avatar: uploadImage called, avatarUrl included in POST body', async () => {
    mockUploadImage.mockResolvedValueOnce({
      success: true,
      data: { url: '/uploads/avatar.png' },
    });
    const created = { id: '2', displayName: 'Carol', avatarUrl: '/uploads/avatar.png' };
    mockFrontendFetch.mockResolvedValueOnce({ success: true, data: created });

    await createGuest({
      displayName: 'Carol',
      avatarBase64: 'aGVsbG8=',
      avatarMimeType: 'image/png',
    });

    expect(mockUploadImage).toHaveBeenCalledWith('/api/assets/guests/upload', {
      base64: 'aGVsbG8=',
      mimeType: 'image/png',
    });
    expect(mockFrontendFetch).toHaveBeenCalledWith('/api/assets/guests', {
      method: 'POST',
      body: JSON.stringify({ displayName: 'Carol', avatarUrl: '/uploads/avatar.png' }),
    });
  });

  test('avatar upload fails: returns errorResponse', async () => {
    mockUploadImage.mockResolvedValueOnce({ success: false, error: 'bad' });

    const result = await createGuest({
      displayName: 'Dan',
      avatarBase64: 'aGVsbG8=',
    });

    expect(mockFrontendFetch).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Error: Avatar upload failed: bad' }],
      isError: true,
    });
  });
});

// ---------------------------------------------------------------------------
// update-guest
// ---------------------------------------------------------------------------

describe('update-guest', () => {
  test('PATCH with id and avatarUrl from upload', async () => {
    mockUploadImage.mockResolvedValueOnce({
      success: true,
      data: { url: '/uploads/new-avatar.jpg' },
    });
    const updated = { id: 'abc-123', displayName: 'Eve', avatarUrl: '/uploads/new-avatar.jpg' };
    mockFrontendFetch.mockResolvedValueOnce({ success: true, data: updated });

    const result = await updateGuest({
      id: 'abc-123',
      displayName: 'Eve',
      avatarImageUrl: 'https://example.com/photo.jpg',
    });

    expect(mockUploadImage).toHaveBeenCalledWith('/api/assets/guests/upload', {
      url: 'https://example.com/photo.jpg',
    });
    expect(mockFrontendFetch).toHaveBeenCalledWith('/api/assets/guests/abc-123', {
      method: 'PATCH',
      body: JSON.stringify({ displayName: 'Eve', avatarUrl: '/uploads/new-avatar.jpg' }),
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }],
    });
  });
});

// ---------------------------------------------------------------------------
// delete-guest
// ---------------------------------------------------------------------------

describe('delete-guest', () => {
  test('DELETE returns success text', async () => {
    mockFrontendFetch.mockResolvedValueOnce({ success: true });

    const result = await deleteGuest({ id: 'abc-123' });

    expect(mockFrontendFetch).toHaveBeenCalledWith('/api/assets/guests/abc-123', {
      method: 'DELETE',
    });
    expect(result).toEqual({
      content: [{ type: 'text', text: 'Guest deleted successfully.' }],
    });
  });

  test('DELETE error is forwarded', async () => {
    mockFrontendFetch.mockResolvedValueOnce({ success: false, error: 'Not found' });

    const result = await deleteGuest({ id: 'missing-id' });

    expect(result).toEqual({
      content: [{ type: 'text', text: 'Error: Not found' }],
      isError: true,
    });
  });
});

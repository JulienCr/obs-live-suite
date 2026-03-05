import {
  backendFetch,
  frontendFetch,
  uploadImage,
  errorResponse,
  textResponse,
  jsonResponse,
} from '../src/httpClient';

jest.mock('../src/config', () => ({
  BACKEND_URL: 'http://localhost:3002',
  FRONTEND_URL: 'http://localhost:3000',
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

function okResponse(body: string, contentType = 'application/json') {
  return {
    ok: true,
    status: 200,
    text: () => Promise.resolve(body),
    headers: new Headers({ 'content-type': contentType }),
  };
}

function errorHttpResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    text: () => Promise.resolve(body),
    headers: new Headers(),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

// ---------------------------------------------------------------------------
// doFetch (via backendFetch / frontendFetch)
// ---------------------------------------------------------------------------

describe('doFetch via backendFetch/frontendFetch', () => {
  test('success JSON response returns { success: true, data, status: 200 }', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('{"id":1,"name":"test"}'));

    const result = await backendFetch('/api/test');

    expect(result).toEqual({
      success: true,
      data: { id: 1, name: 'test' },
      status: 200,
    });
    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3002/api/test',
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  test('success non-JSON text response returns { success: true, data: undefined, status: 200 }', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('plain text that is not json', 'text/plain'));

    const result = await frontendFetch('/api/health');

    expect(result).toEqual({
      success: true,
      data: undefined,
      status: 200,
    });
  });

  test('HTTP error with JSON body containing error field extracts error message', async () => {
    mockFetch.mockResolvedValueOnce(
      errorHttpResponse(400, '{"error":"Validation failed"}'),
    );

    const result = await backendFetch('/api/bad');

    expect(result).toEqual({
      success: false,
      error: 'Validation failed',
      status: 400,
    });
  });

  test('HTTP error with plain text body returns "HTTP {status}: {text}"', async () => {
    mockFetch.mockResolvedValueOnce(
      errorHttpResponse(500, 'Internal Server Error'),
    );

    const result = await backendFetch('/api/fail');

    expect(result).toEqual({
      success: false,
      error: 'HTTP 500: Internal Server Error',
      status: 500,
    });
  });

  test('network error (fetch throws) returns "Network error: {message}"', async () => {
    mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await backendFetch('/api/down');

    expect(result).toEqual({
      success: false,
      error: 'Network error: ECONNREFUSED',
      status: 0,
    });
  });

  test('FormData body does NOT set Content-Type header', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('{"ok":true}'));

    const formData = new FormData();
    formData.append('file', new Blob(['data']), 'test.txt');

    await frontendFetch('/api/upload', { method: 'POST', body: formData });

    const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = callArgs.headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
  });

  test('custom headers are preserved in the request', async () => {
    mockFetch.mockResolvedValueOnce(okResponse('{"ok":true}'));

    await backendFetch('/api/auth', {
      headers: { Authorization: 'Bearer token123' },
    });

    const callArgs = mockFetch.mock.calls[0][1] as RequestInit;
    const headers = callArgs.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer token123');
    expect(headers['Content-Type']).toBe('application/json');
  });
});

// ---------------------------------------------------------------------------
// uploadImage
// ---------------------------------------------------------------------------

describe('uploadImage', () => {
  test('base64 source creates FormData and calls frontendFetch with POST', async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse('{"url":"/uploads/avatar.png","filename":"avatar.png","type":"image/png"}'),
    );

    const result = await uploadImage('/api/upload', {
      base64: Buffer.from('fake-image').toString('base64'),
      mimeType: 'image/png',
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      url: '/uploads/avatar.png',
      filename: 'avatar.png',
      type: 'image/png',
    });

    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('http://localhost:3000/api/upload');
    expect(options.method).toBe('POST');
    expect(options.body).toBeInstanceOf(FormData);
  });

  test('URL source fetches URL, constructs blob, calls frontendFetch with POST', async () => {
    // First call: fetching the remote image
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'image/jpeg',
        'content-length': '1024',
      }),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
    });
    // Second call: the upload POST
    mockFetch.mockResolvedValueOnce(
      okResponse('{"url":"/uploads/avatar.jpg","filename":"avatar.jpg","type":"image/jpeg"}'),
    );

    const result = await uploadImage('/api/upload', {
      url: 'https://example.com/photo.jpg',
    });

    expect(result.success).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(mockFetch.mock.calls[0][0]).toBe('https://example.com/photo.jpg');

    const [uploadUrl, uploadOptions] = mockFetch.mock.calls[1];
    expect(uploadUrl).toBe('http://localhost:3000/api/upload');
    expect(uploadOptions.method).toBe('POST');
    expect(uploadOptions.body).toBeInstanceOf(FormData);
  });

  test('URL source returns 404 - returns error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      headers: new Headers(),
    });

    const result = await uploadImage('/api/upload', {
      url: 'https://example.com/missing.jpg',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Failed to fetch image from URL: 404');
    expect(result.status).toBe(0);
  });

  test('URL source exceeds 10MB - returns error about size', async () => {
    const hugeSize = 11 * 1024 * 1024;
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: new Headers({
        'content-type': 'image/png',
        'content-length': String(hugeSize),
      }),
    });

    const result = await uploadImage('/api/upload', {
      url: 'https://example.com/huge.png',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('Image too large');
    expect(result.error).toContain(String(hugeSize));
    expect(result.status).toBe(0);
  });

  test('default MIME type is image/jpeg when not specified', async () => {
    mockFetch.mockResolvedValueOnce(
      okResponse('{"url":"/uploads/avatar.jpg","filename":"avatar.jpg","type":"image/jpeg"}'),
    );

    await uploadImage('/api/upload', {
      base64: Buffer.from('fake').toString('base64'),
    });

    const [, options] = mockFetch.mock.calls[0];
    const formData = options.body as FormData;
    const file = formData.get('file') as File;
    expect(file.name).toBe('avatar.jpg');
    expect(file.type).toBe('image/jpeg');
  });
});

// ---------------------------------------------------------------------------
// Response helpers
// ---------------------------------------------------------------------------

describe('response helpers', () => {
  test('errorResponse returns correct format with isError: true', () => {
    const result = errorResponse('something went wrong');

    expect(result).toEqual({
      content: [{ type: 'text', text: 'Error: something went wrong' }],
      isError: true,
    });
  });

  test('textResponse returns correct format', () => {
    const result = textResponse('hello world');

    expect(result).toEqual({
      content: [{ type: 'text', text: 'hello world' }],
    });
  });

  test('jsonResponse returns JSON.stringify with indent 2', () => {
    const data = { foo: 'bar', count: 42 };
    const result = jsonResponse(data);

    expect(result).toEqual({
      content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
    });
  });
});

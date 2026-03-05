import { BACKEND_URL, FRONTEND_URL } from './config.js';

// Accept self-signed certificates (mkcert) in development only
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

export interface FetchResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
}

async function doFetch<T = unknown>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
): Promise<FetchResult<T>> {
  const url = `${baseUrl}${path}`;
  try {
    const headers: Record<string, string> = { ...options.headers as Record<string, string> };
    // Only set Content-Type for non-FormData bodies
    if (!(options.body instanceof FormData) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(10_000),
    });

    let data: T | undefined;
    const text = await response.text();
    try {
      data = JSON.parse(text) as T;
    } catch {
      // non-JSON response
    }

    if (!response.ok) {
      const errorMsg =
        (data && typeof data === 'object' && 'error' in data
          ? String((data as Record<string, unknown>).error)
          : null) ?? `HTTP ${response.status}: ${text.slice(0, 200)}`;
      return { success: false, error: errorMsg, status: response.status };
    }

    return { success: true, data, status: response.status };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Network error: ${message}`, status: 0 };
  }
}

export function errorResponse(message: string) {
  return { content: [{ type: 'text' as const, text: `Error: ${message}` }], isError: true as const };
}

export function textResponse(text: string) {
  return { content: [{ type: 'text' as const, text }] };
}

export function jsonResponse(data: unknown) {
  return textResponse(JSON.stringify(data, null, 2));
}

export function backendFetch<T = unknown>(path: string, options?: RequestInit) {
  return doFetch<T>(BACKEND_URL, path, options);
}

export function frontendFetch<T = unknown>(path: string, options?: RequestInit) {
  return doFetch<T>(FRONTEND_URL, path, options);
}

/**
 * Upload an image to a frontend upload endpoint.
 * Accepts either a base64-encoded image or a URL to fetch from.
 */
export async function uploadImage(
  uploadPath: string,
  source: { base64: string; mimeType?: string } | { url: string },
): Promise<FetchResult<{ url: string; filename: string; type: string }>> {
  let blob: Blob;
  let filename: string;

  if ('base64' in source) {
    const mimeType = source.mimeType || 'image/jpeg';
    const buffer = Buffer.from(source.base64, 'base64');
    blob = new Blob([buffer], { type: mimeType });
    const ext = mimeType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg';
    filename = `avatar.${ext}`;
  } else {
    const response = await fetch(source.url, { signal: AbortSignal.timeout(10_000) });
    if (!response.ok) {
      return { success: false, error: `Failed to fetch image from URL: ${response.status}`, status: 0 };
    }
    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
    if (contentLength > MAX_IMAGE_SIZE) {
      return { success: false, error: `Image too large (${contentLength} bytes, max ${MAX_IMAGE_SIZE})`, status: 0 };
    }
    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    blob = new Blob([buffer], { type: contentType });
    const ext = contentType.split('/')[1]?.split(';')[0]?.replace('jpeg', 'jpg') || 'jpg';
    filename = `avatar.${ext}`;
  }

  const formData = new FormData();
  formData.append('file', blob, filename);

  return frontendFetch<{ url: string; filename: string; type: string }>(uploadPath, {
    method: 'POST',
    body: formData,
  });
}

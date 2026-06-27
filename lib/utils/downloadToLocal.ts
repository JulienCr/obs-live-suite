import { writeFile } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { IMAGE_TYPES, VIDEO_TYPES } from "@/lib/filetypes";
import { getUploadDir } from "@/lib/utils/fileUpload";
import { Logger } from "@/lib/utils/Logger";

const logger = new Logger("DownloadToLocal");

/** Maximum download size (50MB), identical to the download-upload route. */
const MAX_SIZE_BYTES = 50 * 1024 * 1024;

/** Abort the download after 30s, identical to the download-upload route. */
const DOWNLOAD_TIMEOUT_MS = 30000;

/** Known file extensions accepted directly from the URL. */
const KNOWN_EXTENSIONS = [
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "avif",
  "mp4",
  "webm",
  "mov",
];

/** Fallback extension derived from the response Content-Type. */
const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

/**
 * Error carrying the HTTP status the download-upload route should return.
 * Lets the route map failures to the exact same status codes it used before.
 */
export class DownloadError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "DownloadError";
    this.status = status;
  }
}

export interface DownloadResult {
  url: string;
  filename: string;
  type: "image" | "video";
}

/**
 * Determine whether a fileUrl is a remote http(s) URL (not a local asset path).
 */
function isRemoteHttpUrl(url: string): boolean {
  return (
    url.startsWith("http") &&
    !url.startsWith("/data/") &&
    !url.startsWith("/uploads/")
  );
}

/**
 * Fetch a remote URL, validate it (content-type / size), and persist it to the
 * given upload subfolder. Returns the local `/data/uploads/...` URL.
 *
 * Throws {@link DownloadError} (with the appropriate HTTP status) on a bad
 * status, unsupported type, oversized file, or timeout.
 */
export async function downloadRemoteToUpload(
  url: string,
  subfolder: "posters" = "posters"
): Promise<DownloadResult> {
  let contentType = "";
  let arrayBuffer: ArrayBuffer;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "OBS-Live-Suite/1.0",
      },
      signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new DownloadError(
        `Failed to download file: ${response.statusText}`,
        400
      );
    }

    // Validate Content-Type against allowed image/video types
    contentType = response.headers.get("content-type") || "";
    const allowedTypes = [...IMAGE_TYPES, ...VIDEO_TYPES];
    if (!allowedTypes.some((type) => contentType.includes(type.replace("*", "")))) {
      throw new DownloadError(
        `Unsupported file type: ${contentType}. Use images or videos.`,
        400
      );
    }

    // Validate declared size (max 50MB)
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > MAX_SIZE_BYTES) {
      throw new DownloadError("File too large. Maximum size: 50MB", 400);
    }

    arrayBuffer = await response.arrayBuffer();
  } catch (error) {
    // Preserve validation/status errors as-is
    if (error instanceof DownloadError) {
      throw error;
    }

    // Timeout (AbortSignal.timeout surfaces as AbortError / TimeoutError)
    if (
      error instanceof Error &&
      (error.name === "AbortError" || error.name === "TimeoutError")
    ) {
      throw new DownloadError(
        "Download timeout. The file took too long to download (max 30s).",
        408
      );
    }

    // Network/DNS errors from fetch surface as TypeError
    if (error instanceof TypeError) {
      throw new DownloadError(
        "Failed to download media from URL. Check that the URL is valid and accessible.",
        400
      );
    }

    throw error;
  }

  // Double-check actual size after download
  if (arrayBuffer.byteLength > MAX_SIZE_BYTES) {
    throw new DownloadError("File too large. Maximum size: 50MB", 400);
  }

  const type: "image" | "video" = contentType.startsWith("image/")
    ? "image"
    : "video";

  // Derive extension from the URL, falling back to the Content-Type
  let ext = "";
  const urlExt = url.split(".").pop()?.split("?")[0]?.toLowerCase();
  if (urlExt && KNOWN_EXTENSIONS.includes(urlExt)) {
    ext = urlExt;
  } else {
    ext = EXTENSION_BY_CONTENT_TYPE[contentType] || "jpg";
  }

  const uploadDir = await getUploadDir(subfolder);
  const filename = `${randomUUID()}.${ext}`;
  const filepath = join(uploadDir, filename);
  await writeFile(filepath, Buffer.from(arrayBuffer));

  return {
    url: `/data/uploads/${subfolder}/${filename}`,
    filename,
    type,
  };
}

/**
 * Resolve a poster `fileUrl` for create/update: when `downloadToLocal` is
 * requested and the URL is a remote http(s) media URL (and not a YouTube
 * poster), download it to local storage and return the local `/data/uploads`
 * path. On any failure, logs a warning and returns the original remote URL so
 * poster creation/update never fails just because the download failed.
 */
export async function resolvePosterFileUrl(
  fileUrl: string | undefined,
  type: string | undefined,
  downloadToLocal: unknown
): Promise<string | undefined> {
  if (downloadToLocal !== true) return fileUrl;
  if (!fileUrl || typeof fileUrl !== "string") return fileUrl;
  if (type === "youtube") return fileUrl;
  if (!isRemoteHttpUrl(fileUrl)) return fileUrl;

  try {
    const local = await downloadRemoteToUpload(fileUrl);
    return local.url;
  } catch (error) {
    logger.warn(
      `Failed to download poster media to local storage; keeping remote URL: ${fileUrl}`,
      error
    );
    return fileUrl;
  }
}

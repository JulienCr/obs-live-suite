import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { PathManager } from "@/lib/config/PathManager";
import { IMAGE_TYPES, VIDEO_TYPES } from "@/lib/filetypes";
import { getMediaTypeFromUrl, getFilenameFromUrl } from "@/lib/utils/urlDetection";

/**
 * POST /api/assets/download-upload
 * Downloads a file from an external URL and uploads it to local storage
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: "No URL provided" },
        { status: 400 }
      );
    }

    // Fetch the file from the external URL
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'OBS-Live-Suite/1.0',
      },
      // Timeout after 30 seconds
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to download file: ${response.statusText}` },
        { status: 400 }
      );
    }

    // Get Content-Type and validate
    const contentType = response.headers.get('content-type') || '';
    const allowedTypes = [...IMAGE_TYPES, ...VIDEO_TYPES];

    if (!allowedTypes.some(type => contentType.includes(type.replace('*', '')))) {
      return NextResponse.json(
        { error: `Unsupported file type: ${contentType}. Use images or videos.` },
        { status: 400 }
      );
    }

    // Get Content-Length and validate size (max 50MB)
    const contentLength = response.headers.get('content-length');
    const maxSizeBytes = 50 * 1024 * 1024; // 50MB

    if (contentLength && parseInt(contentLength) > maxSizeBytes) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 50MB" },
        { status: 400 }
      );
    }

    // Download the file
    const arrayBuffer = await response.arrayBuffer();

    // Double-check size after download
    if (arrayBuffer.byteLength > maxSizeBytes) {
      return NextResponse.json(
        { error: "File too large. Maximum size: 50MB" },
        { status: 400 }
      );
    }

    // Determine file type
    const mediaType = getMediaTypeFromUrl(url);
    const type = contentType.startsWith('image/') ? 'image' : 'video';

    // Get extension from URL or Content-Type
    let ext = '';
    const urlExt = url.split('.').pop()?.split('?')[0]?.toLowerCase();
    if (urlExt && ['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif', 'mp4', 'webm', 'mov'].includes(urlExt)) {
      ext = urlExt;
    } else {
      // Fallback to Content-Type
      const typeMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/avif': 'avif',
        'video/mp4': 'mp4',
        'video/webm': 'webm',
        'video/quicktime': 'mov',
      };
      ext = typeMap[contentType] || 'jpg';
    }

    // Get data directory from PathManager
    const pathManager = PathManager.getInstance();
    const dataDir = pathManager.getDataDir();

    // Create upload directory
    const uploadDir = join(dataDir, "uploads", "posters");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generate unique filename
    const filename = `${randomUUID()}.${ext}`;
    const filepath = join(uploadDir, filename);

    // Write file to disk
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filepath, buffer);

    // Return URL relative to data directory
    const relativeUrl = `/data/uploads/posters/${filename}`;

    return NextResponse.json({
      url: relativeUrl,
      filename,
      type,
    });

  } catch (error) {
    console.error("Download-upload error:", error);

    // Handle timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: "Download timeout. The file took too long to download (max 30s)." },
        { status: 408 }
      );
    }

    // Handle fetch errors (network, DNS, etc.)
    if (error instanceof TypeError) {
      return NextResponse.json(
        { error: "Failed to download media from URL. Check that the URL is valid and accessible." },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to download and upload file" },
      { status: 500 }
    );
  }
}

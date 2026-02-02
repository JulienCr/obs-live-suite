import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import { createReadStream } from "fs";
import { join } from "path";
import { PathManager } from "@/lib/config/PathManager";
import { existsSync } from "fs";

/**
 * GET /data/[...path]
 * Serve uploaded files from the data directory
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const pathManager = PathManager.getInstance();
    const dataDir = pathManager.getDataDir();

    // Await params before accessing properties
    const resolvedParams = await params;

    // Construct file path
    const filePath = join(dataDir, ...resolvedParams.path);

    // Security check: ensure the resolved path is still within data directory
    if (!filePath.startsWith(dataDir)) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // Check if file exists
    if (!existsSync(filePath)) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Determine content type based on extension
    const ext = filePath.split(".").pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      mp4: "video/mp4",
      avif: "image/avif",
      webm: "video/webm",
      mov: "video/quicktime",
    };

    const contentType = contentTypeMap[ext || ""] || "application/octet-stream";

    // Get file size for range requests
    const fileStat = await stat(filePath);
    const fileSize = fileStat.size;

    // Parse Range header for video seeking support
    const rangeHeader = request.headers.get("range");

    if (rangeHeader && contentType.startsWith("video/")) {
      // Handle Range request for video (enables seeking)
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      // Validate range
      if (start >= fileSize || end >= fileSize || start > end) {
        return new NextResponse("Range Not Satisfiable", {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      // Create a readable stream for the requested chunk
      const stream = createReadStream(filePath, { start, end });

      // Convert Node.js stream to Web ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          stream.on("data", (chunk) => controller.enqueue(chunk));
          stream.on("end", () => controller.close());
          stream.on("error", (err) => controller.error(err));
        },
        cancel() {
          stream.destroy();
        },
      });

      return new NextResponse(webStream, {
        status: 206,
        headers: {
          "Content-Type": contentType,
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": String(chunkSize),
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // Non-range request: return full file with Accept-Ranges header
    const fileBuffer = await readFile(filePath);

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        "Content-Type": contentType,
        "Accept-Ranges": "bytes",
        "Content-Length": String(fileSize),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("File serve error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}


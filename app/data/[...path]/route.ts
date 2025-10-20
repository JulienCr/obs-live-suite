import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { join } from "path";
import { PathManager } from "@/lib/config/PathManager";
import { existsSync } from "fs";

/**
 * GET /data/[...path]
 * Serve uploaded files from the data directory
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const pathManager = PathManager.getInstance();
    const dataDir = pathManager.getDataDir();
    
    // Construct file path
    const filePath = join(dataDir, ...params.path);
    
    // Security check: ensure the resolved path is still within data directory
    if (!filePath.startsWith(dataDir)) {
      return new NextResponse("Forbidden", { status: 403 });
    }
    
    // Check if file exists
    if (!existsSync(filePath)) {
      return new NextResponse("Not Found", { status: 404 });
    }
    
    // Read file
    const fileBuffer = await readFile(filePath);
    
    // Determine content type based on extension
    const ext = filePath.split(".").pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
    };
    
    const contentType = contentTypeMap[ext || ""] || "application/octet-stream";
    
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("File serve error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}


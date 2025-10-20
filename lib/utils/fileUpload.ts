import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { PathManager } from "../config/PathManager";

export interface UploadOptions {
  subfolder: "posters" | "guests";
  allowedTypes: string[];
  maxSizeMB?: number;
}

export interface UploadResult {
  url: string;
  filename: string;
  type?: "image" | "video";
}

/**
 * Shared file upload utility
 * Stores uploads in the same directory as the database for data portability
 */
export async function uploadFile(
  file: File,
  options: UploadOptions
): Promise<UploadResult> {
  // Validate file type
  if (!options.allowedTypes.includes(file.type)) {
    const typesStr = options.allowedTypes
      .map(t => t.replace("image/", "").replace("video/", ""))
      .join(", ");
    throw new Error(`Invalid file type. Supported: ${typesStr}`);
  }

  // Validate file size if specified
  if (options.maxSizeMB) {
    const maxBytes = options.maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      throw new Error(`File too large. Maximum size: ${options.maxSizeMB}MB`);
    }
  }

  // Get data directory from PathManager (same location as database)
  const pathManager = PathManager.getInstance();
  const dataDir = pathManager.getDataDir();
  
  // Create upload directory inside data directory
  const uploadDir = join(dataDir, "uploads", options.subfolder);
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }

  // Generate unique filename
  const ext = file.name.split(".").pop();
  const filename = `${randomUUID()}.${ext}`;
  const filepath = join(uploadDir, filename);

  // Convert file to buffer and write
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  await writeFile(filepath, buffer);

  // Return URL relative to data directory
  const relativeUrl = `/data/uploads/${options.subfolder}/${filename}`;

  return {
    url: relativeUrl,
    filename,
    type: file.type.startsWith("image/") ? "image" : "video",
  };
}


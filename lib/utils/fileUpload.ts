import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { spawn } from "child_process";
import { PathManager } from "../config/PathManager";

type UploadSubfolder = "posters" | "guests" | "quiz" | "title-logos";

/**
 * Ensure an upload subdirectory exists and return its absolute path.
 * Shared across file-upload routes and external-download routes.
 */
export async function getUploadDir(subfolder: UploadSubfolder): Promise<string> {
  const dataDir = PathManager.getInstance().getDataDir();
  const dir = join(dataDir, "uploads", subfolder);
  await mkdir(dir, { recursive: true });
  return dir;
}

export interface UploadOptions {
  subfolder: "posters" | "guests" | "quiz" | "title-logos";
  allowedTypes: string[];
  maxSizeMB?: number;
}

export interface UploadResult {
  url: string;
  filename: string;
  type?: "image" | "video";
  duration?: number; // Duration in seconds for video files
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

  // Get (or create) upload directory
  const uploadDir = await getUploadDir(options.subfolder);

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
  const type = file.type.startsWith("image/") ? "image" : "video";

  // Extract video duration if it's a video file
  if (type === "video") {
    const duration = await getVideoDuration(filepath);
    return {
      url: relativeUrl,
      filename,
      type,
      duration: duration ?? undefined,
    };
  }

  return {
    url: relativeUrl,
    filename,
    type,
  };
}

/**
 * Convert a /data/... URL to an absolute file path
 * URL: /data/uploads/posters/xxx.mp4 → {dataDir}/uploads/posters/xxx.mp4
 */
export function urlToFilePath(url: string): string {
  const pathManager = PathManager.getInstance();
  const dataDir = pathManager.getDataDir();

  // Strip /data/ prefix
  const relativePath = url.replace(/^\/data\//, "");
  return join(dataDir, relativePath);
}

/**
 * Extract video duration using ffprobe
 * @param filePath - Absolute path to video file
 * @returns Duration in seconds, or null if extraction fails
 */
export async function getVideoDuration(
  filePath: string
): Promise<number | null> {
  return new Promise((resolve) => {
    const ffprobe = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);

    let output = "";
    ffprobe.stdout.on("data", (data) => {
      output += data.toString();
    });

    ffprobe.on("close", (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        resolve(isNaN(duration) ? null : Math.floor(duration));
      } else {
        resolve(null);
      }
    });

    ffprobe.on("error", () => resolve(null));
  });
}


import { NextResponse } from "next/server";
import { readFile, mkdir, readdir, copyFile, rm } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { PathManager } from "@/lib/config/PathManager";

const execFileAsync = promisify(execFile);
const TIMEOUT_MS = 30000;

/**
 * Get the browser to use for cookies from settings, default to "chrome"
 */
async function getCookiesBrowser(): Promise<string> {
  try {
    const { SettingsService } = await import("@/lib/services/SettingsService");
    const settings = SettingsService.getInstance();
    const browser = settings.getInstagramCookiesBrowser();
    return browser || "chrome";
  } catch {
    return "chrome";
  }
}

/**
 * Extract shortcode from Instagram URL (/p/CODE/ or /reel/CODE/)
 */
function extractShortcode(url: string): string | null {
  try {
    const urlObj = new URL(url.includes("://") ? url : `https://${url}`);
    const match = urlObj.pathname.match(/^\/(p|reel)\/([^/]+)/);
    return match ? match[2] : null;
  } catch {
    return null;
  }
}

/**
 * Download Instagram post/reel media using yt-dlp (videos) with instaloader fallback (images)
 */
async function downloadMedia(url: string): Promise<{ filePath: string; ext: string; title: string; source: string; type: "image" | "video"; duration: number | null }> {
  const cookiesBrowser = await getCookiesBrowser();

  // Try yt-dlp first (works for videos/reels, returns empty for image posts)
  const { stdout: metaJson } = await execFileAsync("yt-dlp", [
    "--cookies-from-browser", cookiesBrowser,
    "--dump-json",
    "--no-download",
    url,
  ], { timeout: TIMEOUT_MS });

  const trimmedMeta = metaJson.trim();

  if (trimmedMeta) {
    // yt-dlp found video content — download it
    const meta = JSON.parse(trimmedMeta);
    const description = meta.description || "";
    const title = description.split("\n")[0]?.trim() || meta.title || "Instagram media";
    const source = meta.uploader ? `@${meta.uploader}` : "Instagram";
    const duration = meta.duration ? Math.round(meta.duration) : null;
    const ext = meta.ext || "mp4";

    const pathManager = PathManager.getInstance();
    const dataDir = pathManager.getDataDir();
    const uploadDir = join(dataDir, "uploads", "posters");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filename = `${randomUUID()}.${ext}`;
    const filePath = join(uploadDir, filename);

    await execFileAsync("yt-dlp", [
      "--cookies-from-browser", cookiesBrowser,
      "-o", filePath,
      url,
    ], { timeout: TIMEOUT_MS });

    return { filePath, ext, title, source, type: "video", duration };
  }

  // yt-dlp returned nothing (image post) — fall back to instaloader
  return downloadMediaViaInstaloader(url);
}

/**
 * Download Instagram image post via instaloader (shortcode-based)
 */
async function downloadMediaViaInstaloader(url: string): Promise<{ filePath: string; ext: string; title: string; source: string; type: "image" | "video"; duration: number | null }> {
  const shortcode = extractShortcode(url);
  if (!shortcode) {
    throw new Error("Could not extract Instagram shortcode from URL");
  }

  const tmpDir = join(tmpdir(), `instaloader-${randomUUID()}`);
  await mkdir(tmpDir, { recursive: true });

  try {
    const META_SEPARATOR = "|||";
    await execFileAsync("instaloader", [
      `--dirname-pattern=${tmpDir}`,
      "--no-metadata-json",
      `--post-metadata-txt={owner_username}${META_SEPARATOR}{caption}`,
      "--",
      `-${shortcode}`,
    ], { timeout: TIMEOUT_MS });

    // Parse metadata from the .txt file (format: "username|||caption")
    const files = await readdir(tmpDir);
    const txtFile = files.find(f => f.endsWith(".txt"));
    let ownerUsername = "";
    let caption = "";
    if (txtFile) {
      const metaContent = await readFile(join(tmpDir, txtFile), "utf-8");
      const sepIndex = metaContent.indexOf(META_SEPARATOR);
      if (sepIndex !== -1) {
        ownerUsername = metaContent.slice(0, sepIndex).trim();
        caption = metaContent.slice(sepIndex + META_SEPARATOR.length).trim();
      }
    }

    // Title = first line of caption
    const title = caption.split("\n")[0]?.trim() || "Instagram";
    const source = ownerUsername ? `@${ownerUsername}` : "Instagram";

    // Find downloaded media files
    const mediaFile = files.find(f =>
      f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".png") ||
      f.endsWith(".mp4") || f.endsWith(".webm")
    );

    if (!mediaFile) {
      throw new Error("Instaloader downloaded no media files");
    }

    const ext = mediaFile.split(".").pop() || "jpg";
    const isVideo = ext === "mp4" || ext === "webm";

    // Copy to posters upload directory
    const pathManager = PathManager.getInstance();
    const dataDir = pathManager.getDataDir();
    const uploadDir = join(dataDir, "uploads", "posters");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const destFilename = `${randomUUID()}.${ext}`;
    const destPath = join(uploadDir, destFilename);
    await copyFile(join(tmpDir, mediaFile), destPath);

    return {
      filePath: destPath,
      ext,
      title,
      source,
      type: isVideo ? "video" : "image",
      duration: null,
    };
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * Download Instagram profile picture using instaloader
 */
async function downloadProfilePic(username: string): Promise<string> {
  const tmpDir = join(tmpdir(), `instaloader-${randomUUID()}`);
  await mkdir(tmpDir, { recursive: true });

  try {
    await execFileAsync("instaloader", [
      "--no-posts",
      "--no-video-thumbnails",
      "--profile-pic-only",
      `--dirname-pattern=${tmpDir}/{profile}`,
      "--",
      username,
    ], { timeout: TIMEOUT_MS });

    // Find the downloaded profile pic
    const profileDir = join(tmpDir, username);
    if (!existsSync(profileDir)) {
      throw new Error(`Profile directory not found for ${username}`);
    }

    const files = await readdir(profileDir);
    const picFile = files.find(f => f.endsWith(".jpg") || f.endsWith(".jpeg") || f.endsWith(".png"));
    if (!picFile) {
      throw new Error(`No profile picture found for ${username}`);
    }

    // Copy to guests upload directory
    const pathManager = PathManager.getInstance();
    const dataDir = pathManager.getDataDir();
    const guestsDir = join(dataDir, "uploads", "guests");
    if (!existsSync(guestsDir)) {
      await mkdir(guestsDir, { recursive: true });
    }

    const ext = picFile.split(".").pop() || "jpg";
    const destFilename = `${randomUUID()}.${ext}`;
    const destPath = join(guestsDir, destFilename);

    await copyFile(join(profileDir, picFile), destPath);

    return `/data/uploads/guests/${destFilename}`;
  } finally {
    // Clean up temp directory
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * POST /api/assets/instagram
 * Downloads Instagram media (posts/reels) or profile pictures
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, username, type } = body;

    if (type === "profile") {
      // Profile picture download
      const targetUsername = username || url;
      if (!targetUsername || typeof targetUsername !== "string") {
        return NextResponse.json(
          { error: "No username provided" },
          { status: 400 }
        );
      }

      // Clean username (remove @ prefix if present)
      const cleanUsername = targetUsername.replace(/^@/, "").trim();
      if (!cleanUsername || !/^[a-zA-Z0-9._]+$/.test(cleanUsername)) {
        return NextResponse.json(
          { error: "Invalid Instagram username" },
          { status: 400 }
        );
      }

      const imageUrl = await downloadProfilePic(cleanUsername);
      return NextResponse.json({ url: imageUrl });

    } else if (type === "media") {
      // Post/reel media download
      if (!url || typeof url !== "string") {
        return NextResponse.json(
          { error: "No URL provided" },
          { status: 400 }
        );
      }

      const result = await downloadMedia(url);
      const relativeUrl = `/data/uploads/posters/${result.filePath.split("/").pop()}`;

      return NextResponse.json({
        url: relativeUrl,
        type: result.type,
        title: result.title,
        source: result.source,
        duration: result.duration,
      });

    } else {
      return NextResponse.json(
        { error: "Invalid type. Use 'media' or 'profile'" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Instagram download error:", error);

    if (error instanceof Error && error.message.includes("ETIMEOUT")) {
      return NextResponse.json(
        { error: "Download timeout (30s). The Instagram content took too long to download." },
        { status: 408 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to download Instagram content";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

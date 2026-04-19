import { NextResponse } from "next/server";
import { readFile, writeFile, chmod, mkdir, readdir, copyFile, rm } from "fs/promises";
import { join, basename, extname } from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { SettingsService } from "@/lib/services/SettingsService";
import { extractInstagramShortcode } from "@/lib/utils/urlDetection";
import { getUploadDir } from "@/lib/utils/fileUpload";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const execFileAsync = promisify(execFile);
const TIMEOUT_MS = 30000;
const META_SEPARATOR = "\t||||\t";

// Far-future expiry used in Netscape cookie files (Jan 2038).
// Using `0` (session cookie) is ambiguous and some tools treat it as expired.
const COOKIE_EXPIRY_EPOCH = 2147483647;

/**
 * Write a Netscape-format cookie file from a sessionid value.
 * File is written with 0o600 permissions to avoid exposing the token on POSIX systems.
 * Returns the file path, or empty string if no session ID configured.
 */
async function ensureCookieFile(): Promise<string> {
  const settingsService = SettingsService.getInstance();
  const sessionId = settingsService.getInstagramSessionId();
  if (!sessionId) return "";

  const cookiePath = settingsService.getInstagramCookieFilePath();
  const content = [
    "# Netscape HTTP Cookie File",
    `.instagram.com\tTRUE\t/\tTRUE\t${COOKIE_EXPIRY_EPOCH}\tsessionid\t${sessionId}`,
    "",
  ].join("\n");
  await writeFile(cookiePath, content, { encoding: "utf-8", mode: 0o600 });
  // writeFile's `mode` only applies on creation; chmod ensures permissions on overwrite too.
  await chmod(cookiePath, 0o600).catch(() => {});
  return cookiePath;
}

/**
 * Build instaloader auth args depending on available auth method:
 * 1. --cookiefile (from session ID pasted in settings)
 * 2. --login (from instaloader session file)
 * 3. No auth (fallback)
 */
async function getInstaloaderAuthArgs(): Promise<string[]> {
  // Prefer cookie file from session ID
  const cookiePath = await ensureCookieFile();
  if (cookiePath) {
    return ["--cookiefile", cookiePath];
  }

  // Fallback to instaloader session file
  const settingsService = SettingsService.getInstance();
  const username = settingsService.getInstagramUsername();
  if (username && settingsService.isInstagramSessionValid()) {
    return ["--login", username];
  }

  return [];
}

/**
 * Parse instaloader stderr into a user-friendly error response
 */
function parseInstaloaderError(error: unknown): { status: number; message: string } {
  const stderr = (error as { stderr?: string })?.stderr || "";
  const message = error instanceof Error ? error.message : "";
  const combined = `${stderr} ${message}`;

  if (combined.includes("403 Forbidden") || combined.includes("Login required")) {
    return { status: 401, message: "Instagram requiert une authentification. Configurez votre compte dans Paramètres > Instagram." };
  }
  if (combined.includes("does not exist")) {
    return { status: 404, message: "Profil Instagram introuvable." };
  }
  if (combined.includes("rate limit") || combined.includes("429") || combined.includes("Please wait")) {
    return { status: 429, message: "Instagram a limité les requêtes. Réessayez dans quelques minutes." };
  }
  if (combined.includes("Checkpoint") || combined.includes("checkpoint_required")) {
    return { status: 401, message: "Session Instagram expirée. Reconnectez-vous dans Paramètres > Instagram." };
  }
  if (combined.includes("Bad credentials") || combined.includes("Invalid credentials")) {
    return { status: 401, message: "Identifiants Instagram invalides." };
  }
  if (combined.includes("No profile picture found")) {
    return { status: 404, message: "Aucune photo de profil trouvée pour ce compte." };
  }
  return { status: 500, message: "Échec du téléchargement Instagram." };
}

interface MediaDownloadResult {
  filePath: string;
  ext: string;
  title: string;
  source: string;
  type: "image" | "video";
  duration: number | null;
}

/**
 * Download Instagram post/reel media using yt-dlp (videos) with instaloader fallback (images)
 * When urlType is 'post', skips yt-dlp and goes directly to instaloader (image posts don't need yt-dlp).
 */
async function downloadMedia(url: string, urlType?: "post" | "reel"): Promise<MediaDownloadResult> {
  // Skip yt-dlp for known image posts — it would fail and waste up to 30s
  if (urlType === "post") {
    return downloadMediaViaInstaloader(url);
  }

  const cookiesBrowser = SettingsService.getInstance().getInstagramCookiesBrowser();
  const uploadDir = await getUploadDir("posters");
  const outputTemplate = join(uploadDir, `${randomUUID()}.%(ext)s`);

  try {
    const { stdout: metaJson } = await execFileAsync("yt-dlp", [
      "--cookies-from-browser", cookiesBrowser,
      "--print-json",
      "-o", outputTemplate,
      url,
    ], { timeout: TIMEOUT_MS });

    const trimmedMeta = metaJson.trim();

    if (trimmedMeta) {
      const meta = JSON.parse(trimmedMeta);
      const description = meta.description || "";
      const title = description.split("\n")[0]?.trim() || meta.title || "Instagram media";
      const source = meta.uploader ? `@${meta.uploader}` : "Instagram";
      const duration = meta.duration ? Math.round(meta.duration) : null;
      const ext = meta.ext || "mp4";
      const filePath = meta._filename || meta.requested_downloads?.[0]?.filepath || join(uploadDir, `${basename(outputTemplate, ".%(ext)s")}.${ext}`);

      return { filePath, ext, title, source, type: "video", duration };
    }
  } catch {
    // yt-dlp failed (likely image-only post or unsupported format) — fall back to instaloader
  }

  return downloadMediaViaInstaloader(url);
}

/**
 * Download Instagram image post via instaloader (shortcode-based)
 */
async function downloadMediaViaInstaloader(url: string): Promise<MediaDownloadResult> {
  const shortcode = extractInstagramShortcode(url);
  if (!shortcode) {
    throw new Error("Could not extract Instagram shortcode from URL");
  }

  const tmpDir = join(tmpdir(), `instaloader-${randomUUID()}`);
  await mkdir(tmpDir, { recursive: true });

  try {
    const authArgs = await getInstaloaderAuthArgs();
    await execFileAsync("instaloader", [
      ...authArgs,
      `--dirname-pattern=${tmpDir}`,
      "--no-metadata-json",
      `--post-metadata-txt={owner_username}${META_SEPARATOR}{caption}`,
      "--",
      `-${shortcode}`,
    ], { timeout: TIMEOUT_MS });

    // Parse metadata and find media in a single readdir pass
    const files = await readdir(tmpDir);
    let txtFile: string | undefined;
    let mediaFile: string | undefined;
    for (const f of files) {
      if (!txtFile && f.endsWith(".txt")) txtFile = f;
      if (!mediaFile && /\.(jpe?g|png|mp4|webm)$/.test(f)) mediaFile = f;
    }

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

    const title = caption.split("\n")[0]?.trim() || "Instagram";
    const source = ownerUsername ? `@${ownerUsername}` : "Instagram";

    if (!mediaFile) {
      throw new Error("Instaloader downloaded no media files");
    }

    const ext = extname(mediaFile).slice(1) || "jpg";
    const isVideo = ext === "mp4" || ext === "webm";

    const uploadDir = await getUploadDir("posters");
    const destFilename = `${randomUUID()}.${ext}`;
    const destPath = join(uploadDir, destFilename);
    await copyFile(join(tmpDir, mediaFile), destPath);

    return { filePath: destPath, ext, title, source, type: isVideo ? "video" : "image", duration: null };
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
    const authArgs = await getInstaloaderAuthArgs();
    await execFileAsync("instaloader", [
      ...authArgs,
      "--no-posts",
      "--no-video-thumbnails",
      "--profile-pic-only",
      `--dirname-pattern=${tmpDir}/{profile}`,
      "--",
      username,
    ], { timeout: TIMEOUT_MS });

    const profileDir = join(tmpDir, username);
    const files = await readdir(profileDir).catch(() => [] as string[]);
    const picFile = files.find(f => /\.(jpe?g|png)$/.test(f));
    if (!picFile) {
      throw new Error(`No profile picture found for ${username}`);
    }

    const ext = extname(picFile).slice(1) || "jpg";
    const guestsDir = await getUploadDir("guests");
    const destFilename = `${randomUUID()}.${ext}`;
    const destPath = join(guestsDir, destFilename);

    await copyFile(join(profileDir, picFile), destPath);

    return `/data/uploads/guests/${destFilename}`;
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

function isTimeoutError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const err = error as NodeJS.ErrnoException & { killed?: boolean };
  return err.killed === true || err.code === "ETIMEDOUT" || err.message.includes("ETIMEDOUT");
}

/**
 * POST /api/assets/instagram
 * Downloads Instagram media (posts/reels) or profile pictures
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { url, username, type, urlType } = body;

  if (type === "profile") {
    if (!username || typeof username !== "string") {
      return ApiResponses.badRequest("No username provided");
    }

    // Clean username (remove @ prefix if present)
    const cleanUsername = username.replace(/^@/, "").trim();
    if (!cleanUsername || !/^[a-zA-Z0-9._]+$/.test(cleanUsername)) {
      return ApiResponses.badRequest("Invalid Instagram username");
    }

    try {
      const imageUrl = await downloadProfilePic(cleanUsername);
      return ApiResponses.ok({ url: imageUrl });
    } catch (error) {
      if (isTimeoutError(error)) {
        return NextResponse.json(
          { error: "Délai dépassé (30s). Le téléchargement Instagram a pris trop de temps." },
          { status: 408 }
        );
      }
      const parsed = parseInstaloaderError(error);
      return NextResponse.json({ error: parsed.message }, { status: parsed.status });
    }

  } else if (type === "media") {
    if (!url || typeof url !== "string") {
      return ApiResponses.badRequest("No URL provided");
    }

    try {
      const result = await downloadMedia(url, urlType);
      const relativeUrl = `/data/uploads/posters/${basename(result.filePath)}`;

      return ApiResponses.ok({
        url: relativeUrl,
        type: result.type,
        title: result.title,
        source: result.source,
        duration: result.duration,
      });
    } catch (error) {
      if (isTimeoutError(error)) {
        return NextResponse.json(
          { error: "Délai dépassé (30s). Le téléchargement Instagram a pris trop de temps." },
          { status: 408 }
        );
      }
      const parsed = parseInstaloaderError(error);
      return NextResponse.json({ error: parsed.message }, { status: parsed.status });
    }

  } else {
    return ApiResponses.badRequest("Invalid type. Use 'media' or 'profile'");
  }
}, "[InstagramAPI]");

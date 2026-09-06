import { NextResponse } from "next/server";
import { readFile, writeFile, chmod, mkdir, readdir, copyFile, rm } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { tmpdir } from "os";
import { SettingsService } from "@/lib/services/SettingsService";
import { extractInstagramShortcode } from "@/lib/utils/urlDetection";
import { getUploadDir } from "@/lib/utils/fileUpload";
import { downloadRemoteToUpload } from "@/lib/utils/downloadToLocal";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";
import { INSTAGRAM } from "@/lib/config/Constants";
import { Logger } from "@/lib/utils/Logger";

const execFileAsync = promisify(execFile);
const logger = new Logger("InstagramAPI");

const EXEC_OPTIONS = {
  timeout: INSTAGRAM.COMMAND_TIMEOUT_MS,
  maxBuffer: INSTAGRAM.MAX_OUTPUT_BYTES,
};

const VIDEO_EXTENSIONS = new Set<string>(INSTAGRAM.VIDEO_EXTENSIONS);
const IMAGE_EXTENSIONS = new Set<string>(INSTAGRAM.IMAGE_EXTENSIONS);

/**
 * yt-dlp flags for anonymous reads. `--ignore-no-formats-error` is what makes image
 * posts work at all: the extractor calls raise_no_formats() on them, which otherwise
 * aborts before printing any JSON. `--playlist-items 1` keeps a carousel to one media.
 */
const YTDLP_MEDIA_ARGS = [
  "--no-update",
  "--ignore-no-formats-error",
  "--playlist-items",
  "1",
  "--print-json",
];

/** Only the yt-dlp info-dict fields this route reads. */
interface YtDlpMeta {
  description?: string;
  title?: string;
  /** The @handle. `uploader` holds the full name, and `uploader_id` a numeric pk. */
  channel?: string;
  uploader?: string;
  duration?: number;
  thumbnail?: string;
  thumbnails?: { url?: string }[];
}

interface MediaDownloadResult {
  /** Public `/data/uploads/posters/...` path. */
  url: string;
  type: "image" | "video";
  title: string;
  source: string;
  duration: number | null;
}

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
    `.instagram.com\tTRUE\t/\tTRUE\t${INSTAGRAM.COOKIE_EXPIRY_EPOCH}\tsessionid\t${sessionId}`,
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

/** Keep the losing tool's stderr reachable once the fallback has failed too. */
function chainError(primary: unknown, cause: unknown): unknown {
  return primary instanceof Error ? Object.assign(primary, { cause }) : primary;
}

/** Flatten an error and its `cause` chain, so matchers see every tool's output. */
function errorChain(error: unknown, depth = 3): unknown[] {
  if (depth <= 0 || !(error instanceof Error) || !error.cause) return [error];
  return [error, ...errorChain(error.cause, depth - 1)];
}

function errorText(error: unknown): string {
  return errorChain(error)
    .map((e) => {
      const stderr = (e as { stderr?: string })?.stderr || "";
      return `${stderr} ${e instanceof Error ? e.message : ""}`;
    })
    .join(" ")
    .toLowerCase();
}

const UPDATE_YTDLP_MESSAGE =
  `Instagram refuse les requêtes anonymes de yt-dlp. Mettez à jour yt-dlp ` +
  `(« yt-dlp -U », version ${INSTAGRAM.MIN_YTDLP_VERSION} minimum) puis réessayez.`;

const PROFILE_AUTH_MESSAGE =
  "Le téléchargement d'une photo de profil requiert une authentification Instagram : " +
  "renseignez votre sessionid dans Paramètres > Instagram. Les posts et reels publics, " +
  "eux, fonctionnent sans compte.";

const MEDIA_AUTH_MESSAGE =
  "Ce contenu Instagram requiert une authentification (post privé, supprimé ou compte " +
  "restreint). Configurez votre compte dans Paramètres > Instagram.";

const MISSING_TOOL_MESSAGE =
  "Outil introuvable : yt-dlp (ou instaloader pour les photos de profil) n'est pas installé, " +
  "ou absent du PATH. Paramètres > Instagram indique l'état des deux.";

const TIMEOUT_MESSAGE =
  `Délai dépassé (${INSTAGRAM.COMMAND_TIMEOUT_MS / 1000} s par outil). ` +
  "Le téléchargement Instagram a pris trop de temps.";

/**
 * Map a yt-dlp or instaloader failure onto a status and a French message.
 * `scope` matters because only the profile picture still needs an account.
 */
function parseInstagramError(
  error: unknown,
  scope: "media" | "profile"
): { status: number; message: string } {
  const combined = errorText(error);
  const has = (...needles: string[]) => needles.some((n) => combined.includes(n));

  // Checked first: a missing impersonation target also surfaces as a login wall,
  // and the actionable fix is updating the binary, not configuring an account.
  if (has("impersonat", "curl_cffi", "curl-cffi")) {
    return { status: 503, message: UPDATE_YTDLP_MESSAGE };
  }
  // The likeliest first-run failure, and the one a bare 500 explains worst.
  if (has("enoent", "is not recognized", "no such file")) {
    return { status: 503, message: MISSING_TOOL_MESSAGE };
  }
  if (
    has(
      "403 forbidden",
      "login required",
      "login_required",
      "requested content is not available",
      "locked behind the login page",
      "only available for registered users"
    )
  ) {
    return {
      status: 401,
      message: scope === "profile" ? PROFILE_AUTH_MESSAGE : MEDIA_AUTH_MESSAGE,
    };
  }
  if (has("does not exist")) {
    return { status: 404, message: "Profil Instagram introuvable." };
  }
  if (has("rate limit", "rate-limit", "429", "please wait")) {
    return { status: 429, message: "Instagram a limité les requêtes. Réessayez dans quelques minutes." };
  }
  if (has("checkpoint")) {
    return { status: 401, message: "Session Instagram expirée. Reconnectez-vous dans Paramètres > Instagram." };
  }
  if (has("bad credentials", "invalid credentials")) {
    return { status: 401, message: "Identifiants Instagram invalides." };
  }
  if (has("no profile picture found")) {
    return { status: 404, message: "Aucune photo de profil trouvée pour ce compte." };
  }
  if (has("there is no video in this post", "no video formats found")) {
    return { status: 404, message: "Aucun média exploitable dans ce post Instagram." };
  }
  return { status: 500, message: "Échec du téléchargement Instagram." };
}

/**
 * Run yt-dlp, treating a non-zero exit as data rather than as a failure: an image-only
 * post always exits 1 *after* printing its JSON, because yt-dlp only gives up at
 * download time on "no formats".
 */
async function runYtDlp(args: string[]): Promise<{ stdout: string; stderr: string; error?: Error }> {
  try {
    const { stdout, stderr } = await execFileAsync("yt-dlp", args, EXEC_OPTIONS);
    return { stdout: String(stdout ?? ""), stderr: String(stderr ?? "") };
  } catch (error) {
    const err = error as Error & { stdout?: string; stderr?: string };
    return { stdout: String(err.stdout ?? ""), stderr: String(err.stderr ?? ""), error: err };
  }
}

/** `--print-json` emits one compact JSON object per line. */
function parseJsonLines(stdout: string): YtDlpMeta[] {
  const parsed: YtDlpMeta[] = [];
  for (const line of stdout.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      parsed.push(JSON.parse(trimmed) as YtDlpMeta);
    } catch {
      // A line truncated by maxBuffer is not worth failing the whole read over.
    }
  }
  return parsed;
}

type ClaimedOutput = { filename: string; type: "image" | "video" } | "partial" | null;

/**
 * Identify what yt-dlp actually wrote for this run, and delete the leftovers.
 * The printed JSON cannot tell us: it is emitted before the download, so `_filename`
 * reads `<uuid>.NA` on an image post and lies after a remux. The random prefix makes
 * a directory scan unambiguous instead.
 */
async function claimYtDlpOutput(dir: string, prefix: string): Promise<ClaimedOutput> {
  const entries = (await readdir(dir).catch(() => [])) as string[];
  const mine = entries.filter((f) => f.startsWith(`${prefix}.`));
  const extOf = (f: string) => extname(f).slice(1).toLowerCase();

  const picked =
    mine.find((f) => VIDEO_EXTENSIONS.has(extOf(f))) ??
    mine.find((f) => IMAGE_EXTENSIONS.has(extOf(f)));

  await Promise.all(
    mine
      .filter((f) => f !== picked)
      .map((f) => rm(join(dir, f), { force: true }).catch(() => {}))
  );

  if (picked) {
    return { filename: picked, type: VIDEO_EXTENSIONS.has(extOf(picked)) ? "video" : "image" };
  }
  return mine.length ? "partial" : null;
}

/** Caption first line + owner handle: the two fields the poster UI displays. */
function describeMedia(caption: string, owner: string, fallbackTitle: string) {
  return {
    title: caption.split("\n")[0]?.trim() || fallbackTitle,
    source: owner ? `@${owner}` : "Instagram",
  };
}

/**
 * Download an Instagram post or reel with yt-dlp, without any cookie: the extractor
 * impersonates a browser TLS fingerprint for Instagram's logged-out GraphQL query.
 * Image posts download nothing, so their best thumbnail *is* the post image.
 */
async function downloadMediaViaYtDlp(url: string): Promise<MediaDownloadResult> {
  const uploadDir = await getUploadDir("posters");
  const prefix = randomUUID();
  const cookiePath = await ensureCookieFile();

  const run = await runYtDlp([
    ...YTDLP_MEDIA_ARGS,
    ...(cookiePath ? ["--cookies", cookiePath] : []),
    "-o",
    join(uploadDir, `${prefix}.%(ext)s`),
    "--",
    url,
  ]);

  // Scanned even on failure: this is also what removes a killed download's `.part`.
  const claimed = await claimYtDlpOutput(uploadDir, prefix);
  const meta = parseJsonLines(run.stdout)[0];

  if (claimed === "partial" || (!claimed && !meta)) {
    throw run.error ?? new Error("yt-dlp returned no Instagram metadata");
  }

  const owner = meta?.channel || meta?.uploader || "";
  const { title, source } = describeMedia(
    meta?.description || "",
    owner,
    meta?.title || "Instagram media"
  );

  if (claimed) {
    return {
      url: `/data/uploads/posters/${claimed.filename}`,
      type: claimed.type,
      title,
      source,
      duration: meta?.duration ? Math.round(meta.duration) : null,
    };
  }

  const thumbnail = meta?.thumbnail || meta?.thumbnails?.at(-1)?.url || "";
  if (!thumbnail) {
    throw run.error ?? new Error("Instagram post has no downloadable media");
  }

  const local = await downloadRemoteToUpload(thumbnail);
  return { url: local.url, type: local.type, title, source, duration: null };
}

/**
 * Download Instagram media via instaloader (shortcode-based).
 * Fallback path: it needs a session for anything yt-dlp could not read anonymously.
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
      `--post-metadata-txt={owner_username}${INSTAGRAM.META_SEPARATOR}{caption}`,
      "--",
      `-${shortcode}`,
    ], EXEC_OPTIONS);

    // Parse metadata and find media in a single readdir pass
    const files = (await readdir(tmpDir)) as string[];
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
      const sepIndex = metaContent.indexOf(INSTAGRAM.META_SEPARATOR);
      if (sepIndex !== -1) {
        ownerUsername = metaContent.slice(0, sepIndex).trim();
        caption = metaContent.slice(sepIndex + INSTAGRAM.META_SEPARATOR.length).trim();
      }
    }

    if (!mediaFile) {
      throw new Error("Instaloader downloaded no media files");
    }

    const ext = extname(mediaFile).slice(1) || "jpg";
    const isVideo = ext === "mp4" || ext === "webm";

    const uploadDir = await getUploadDir("posters");
    const destFilename = `${randomUUID()}.${ext}`;
    await copyFile(join(tmpDir, mediaFile), join(uploadDir, destFilename));

    return {
      url: `/data/uploads/posters/${destFilename}`,
      type: isVideo ? "video" : "image",
      ...describeMedia(caption, ownerUsername, "Instagram"),
      duration: null,
    };
  } finally {
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/**
 * yt-dlp handles public posts and reels without an account; instaloader only picks up
 * what it could not read — a private post, or an extractor Instagram has just broken.
 */
async function downloadMedia(url: string): Promise<MediaDownloadResult> {
  try {
    return await downloadMediaViaYtDlp(url);
  } catch (ytDlpError) {
    logger.warn("yt-dlp could not fetch the post, falling back to instaloader", ytDlpError);
    try {
      return await downloadMediaViaInstaloader(url);
    } catch (instaloaderError) {
      throw chainError(instaloaderError, ytDlpError);
    }
  }
}

/**
 * Download an Instagram profile picture via instaloader.
 * yt-dlp has no extractor for profile pictures, so this path still needs a session.
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
    ], EXEC_OPTIONS);

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
  return errorChain(error).some((e) => {
    if (!(e instanceof Error)) return false;
    const err = e as NodeJS.ErrnoException & { killed?: boolean };
    return err.killed === true || err.code === "ETIMEDOUT" || err.message.includes("ETIMEDOUT");
  });
}

function instagramErrorResponse(error: unknown, scope: "media" | "profile"): NextResponse {
  const { status, message } = parseInstagramError(error, scope);
  // A named diagnosis beats the timeout: the two tools chain, so a first-attempt
  // hang would otherwise mask what the second one actually reported.
  if (status === 500 && isTimeoutError(error)) {
    return NextResponse.json({ error: TIMEOUT_MESSAGE }, { status: 408 });
  }
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST /api/assets/instagram
 * Downloads Instagram media (posts/reels) or profile pictures
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { url, username, type } = body;

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
      return instagramErrorResponse(error, "profile");
    }

  } else if (type === "media") {
    if (!url || typeof url !== "string") {
      return ApiResponses.badRequest("No URL provided");
    }

    try {
      const result = await downloadMedia(url);
      return ApiResponses.ok({
        url: result.url,
        type: result.type,
        title: result.title,
        source: result.source,
        duration: result.duration,
      });
    } catch (error) {
      return instagramErrorResponse(error, "media");
    }

  } else {
    return ApiResponses.badRequest("Invalid type. Use 'media' or 'profile'");
  }
}, "[InstagramAPI]");

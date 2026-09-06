import { execFile } from "child_process";
import { promisify } from "util";
import { SettingsService } from "@/lib/services/SettingsService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";
import { INSTAGRAM } from "@/lib/config/Constants";

const execFileAsync = promisify(execFile);
const LOG_CONTEXT = "[InstagramHealth]";

const PROBE_OPTIONS = { timeout: INSTAGRAM.HEALTH_TIMEOUT_MS };

interface ToolProbe {
  found: boolean;
  version: string;
  /** Every binary the PATH resolves; more than one is a silent-breakage hazard. */
  paths: string[];
}

async function probeVersion(binary: string, args: string[]): Promise<string> {
  const { stdout } = await execFileAsync(binary, args, PROBE_OPTIONS);
  return String(stdout).trim().split(/\r?\n/)[0] || "";
}

/** Resolve every match on the PATH, so a shadowing second install becomes visible. */
async function probePaths(binary: string): Promise<string[]> {
  const finder = process.platform === "win32" ? "where" : "which";
  const args = process.platform === "win32" ? [binary] : ["-a", binary];
  try {
    const { stdout } = await execFileAsync(finder, args, PROBE_OPTIONS);
    return String(stdout)
      .trim()
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * True when the extractor is old enough to have stopped working: Instagram rotates its
 * GraphQL doc_id every few weeks, and yt-dlp itself warns past 90 days.
 */
function isOutdated(version: string): boolean {
  const match = version.match(/^(\d{4})\.(\d{2})\.(\d{2})/);
  if (!match) return true;
  if (version < INSTAGRAM.MIN_YTDLP_VERSION) return true;

  const released = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return (Date.now() - released) / 86_400_000 > INSTAGRAM.YTDLP_STALE_DAYS;
}

/**
 * GET /api/settings/instagram/health
 * Reports whether the external binaries can actually serve each Instagram flow.
 */
export const GET = withSimpleErrorHandler(async () => {
  const [ytdlpVersion, ytdlpPaths, impersonateOutput, instaloaderVersion, instaloaderPaths] =
    await Promise.all([
      probeVersion("yt-dlp", ["--no-update", "--version"]).catch(() => ""),
      probePaths("yt-dlp"),
      execFileAsync("yt-dlp", ["--no-update", "--list-impersonate-targets"], PROBE_OPTIONS)
        .then(({ stdout }) => String(stdout))
        .catch(() => ""),
      probeVersion("instaloader", ["--version"]).catch(() => ""),
      probePaths("instaloader"),
    ]);

  // A target line reading "(unavailable)" means the build ships without curl_cffi,
  // which is exactly what breaks anonymous Instagram reads.
  const targets = impersonateOutput.split(/\r?\n/).filter((line) => /curl[_-]cffi/i.test(line));
  const impersonation = targets.length > 0 && !targets.some((line) => line.includes("unavailable"));

  const ytdlp = {
    found: !!ytdlpVersion,
    version: ytdlpVersion,
    paths: ytdlpPaths,
    outdated: !ytdlpVersion || isOutdated(ytdlpVersion),
    impersonation,
  };

  const instaloader: ToolProbe = {
    found: !!instaloaderVersion,
    version: instaloaderVersion,
    paths: instaloaderPaths,
  };

  return ApiResponses.ok({
    ytdlp,
    instaloader,
    session: { configured: !!SettingsService.getInstance().getInstagramSessionId() },
    minYtdlpVersion: INSTAGRAM.MIN_YTDLP_VERSION,
  });
}, LOG_CONTEXT);

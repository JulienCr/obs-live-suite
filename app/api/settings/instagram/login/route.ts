import { execFile, spawn } from "child_process";
import { promisify } from "util";
import { SettingsService } from "@/lib/services/SettingsService";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const execFileAsync = promisify(execFile);
const LOGIN_TIMEOUT_MS = 30000;
const LOG_CONTEXT = "[InstagramLogin]";

/**
 * POST /api/settings/instagram/login
 * Log in to Instagram via instaloader.
 *
 * Body: { username, password }           — initial login
 * Body: { username, password, twoFA }    — 2FA verification
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { username, password, twoFA } = body;

  if (!username || typeof username !== "string") {
    return ApiResponses.badRequest("Username is required");
  }
  if (!password || typeof password !== "string") {
    return ApiResponses.badRequest("Password is required");
  }

  const cleanUsername = username.replace(/^@/, "").trim();
  if (!/^[a-zA-Z0-9._]+$/.test(cleanUsername)) {
    return ApiResponses.badRequest("Invalid Instagram username");
  }

  // If 2FA code is provided, use spawn to pipe it to stdin
  if (twoFA) {
    return loginWith2FA(cleanUsername, password, twoFA);
  }

  // Standard login attempt
  try {
    const { stderr } = await execFileAsync("instaloader", [
      "--login", cleanUsername,
      "-p", password,
      "--no-posts",
      "--no-profile-pic",
      "--no-captions",
      "--no-metadata-json",
      "--no-compress-json",
      "--quiet",
      "--",
      cleanUsername,
    ], { timeout: LOGIN_TIMEOUT_MS });

    // Check if 2FA is needed
    if (stderr && (stderr.includes("Enter 2FA") || stderr.includes("two-factor"))) {
      return ApiResponses.ok({
        success: false,
        needs2FA: true,
        message: "Code de vérification 2FA requis.",
      });
    }

    // Save the username to settings
    const settingsService = SettingsService.getInstance();
    settingsService.saveInstagramUsername(cleanUsername);

    return ApiResponses.ok({
      success: true,
      message: "Connexion Instagram réussie.",
      hasSession: settingsService.isInstagramSessionValid(cleanUsername),
    });
  } catch (error) {
    const stderr = (error as { stderr?: string })?.stderr || "";

    if (stderr.includes("Enter 2FA") || stderr.includes("two-factor") || stderr.includes("security code")) {
      return ApiResponses.ok({
        success: false,
        needs2FA: true,
        message: "Code de vérification 2FA requis.",
      });
    }

    if (stderr.includes("Bad credentials") || stderr.includes("password")) {
      return ApiResponses.ok({
        success: false,
        message: "Identifiants incorrects.",
      });
    }

    if (stderr.includes("Checkpoint") || stderr.includes("checkpoint_required")) {
      return ApiResponses.ok({
        success: false,
        message: "Instagram demande une vérification. Connectez-vous d'abord via le navigateur puis réessayez.",
      });
    }

    if (stderr.includes("403 Forbidden")) {
      return ApiResponses.ok({
        success: false,
        message: "Instagram a bloqué la requête (403). Réessayez plus tard.",
      });
    }

    const detail = stderr.split("\n").filter(Boolean).pop() || "";
    console.error(`${LOG_CONTEXT} Login failed:`, stderr || error);
    return ApiResponses.ok({
      success: false,
      message: detail
        ? `Échec de la connexion : ${detail}`
        : "Échec de la connexion Instagram.",
    });
  }
}, LOG_CONTEXT);

/**
 * Handle 2FA login by spawning instaloader and piping the code to stdin.
 */
async function loginWith2FA(username: string, password: string, code: string) {
  return new Promise<Response>((resolve) => {
    const proc = spawn("instaloader", [
      "--login", username,
      "-p", password,
      "--no-posts",
      "--no-profile-pic",
      "--no-captions",
      "--no-metadata-json",
      "--no-compress-json",
      "--",
      username,
    ], { timeout: LOGIN_TIMEOUT_MS });

    let stderrData = "";
    let resolved = false;

    const finish = (response: Response) => {
      if (!resolved) {
        resolved = true;
        resolve(response);
      }
    };

    proc.stderr?.on("data", (chunk: Buffer) => {
      stderrData += chunk.toString();
      // When instaloader asks for the 2FA code, pipe it
      if (stderrData.includes("Enter 2FA") || stderrData.includes("security code") || stderrData.includes("Verification Code")) {
        proc.stdin?.write(`${code}\n`);
        proc.stdin?.end();
      }
    });

    proc.on("close", (exitCode) => {
      if (exitCode === 0) {
        const settingsService = SettingsService.getInstance();
        settingsService.saveInstagramUsername(username);
        finish(
          Response.json({
            success: true,
            message: "Connexion Instagram réussie avec 2FA.",
            hasSession: settingsService.isInstagramSessionValid(username),
          })
        );
      } else {
        console.error(`${LOG_CONTEXT} 2FA login failed:`, stderrData);
        finish(
          Response.json({
            success: false,
            message: stderrData.includes("Bad") ? "Code 2FA incorrect." : "Échec de la vérification 2FA.",
          })
        );
      }
    });

    proc.on("error", (err) => {
      console.error(`${LOG_CONTEXT} 2FA spawn error:`, err);
      finish(Response.json({ success: false, message: "Erreur lors de la connexion." }));
    });

    // Safety timeout
    setTimeout(() => {
      proc.kill();
      finish(Response.json({ success: false, message: "Délai de connexion dépassé." }));
    }, LOGIN_TIMEOUT_MS);
  });
}

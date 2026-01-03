import { exec } from "child_process";
import { promisify } from "util";
import { platform } from "os";
import { ApiResponses, withSimpleErrorHandler } from "@/lib/utils/ApiResponses";

const execAsync = promisify(exec);

const LOG_CONTEXT = "[SettingsAPI:open-folder]";

/**
 * POST /api/settings/open-folder
 * Open file explorer at a given path
 */
export const POST = withSimpleErrorHandler(async (request: Request) => {
  const body = await request.json();
  const { path } = body;

  if (!path) {
    return ApiResponses.badRequest("Path is required");
  }

  const currentPlatform = platform();
  let command: string;

  switch (currentPlatform) {
    case "win32":
      // Windows: use explorer
      command = `explorer "${path}"`;
      break;
    case "darwin":
      // macOS: use open
      command = `open "${path}"`;
      break;
    case "linux":
      // Linux: use xdg-open
      command = `xdg-open "${path}"`;
      break;
    default:
      return ApiResponses.badRequest(`Unsupported platform: ${currentPlatform}`);
  }

  await execAsync(command);

  return ApiResponses.ok({ success: true });
}, LOG_CONTEXT);

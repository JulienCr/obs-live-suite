import { platform, homedir } from "os";
import { join } from "path";
import { Logger } from "../../utils/Logger";

/**
 * PathResolver provides platform-specific OBS paths
 */
export class PathResolver {
  private logger: Logger;

  constructor() {
    this.logger = new Logger("PathResolver");
  }

  /**
   * Get OBS plugin directories based on platform
   */
  getPluginDirectories(): string[] {
    const currentPlatform = platform();

    switch (currentPlatform) {
      case "win32":
        return [
          "C:\\Program Files\\obs-studio\\obs-plugins",
          join(process.env.PROGRAMFILES || "C:\\Program Files", "obs-studio", "obs-plugins"),
        ];

      case "darwin":
        return [
          "/Applications/OBS.app/Contents/Resources/obs-plugins",
          "/Applications/OBS.app/Contents/PlugIns",
        ];

      case "linux":
        return [
          "/usr/lib/obs-plugins",
          "/usr/lib/x86_64-linux-gnu/obs-plugins",
          "/usr/local/lib/obs-plugins",
        ];

      default:
        this.logger.warn(`Unsupported platform: ${currentPlatform}`);
        return [];
    }
  }

  /**
   * Get OBS scripts directories based on platform
   */
  getScriptDirectories(): string[] {
    const currentPlatform = platform();

    switch (currentPlatform) {
      case "win32":
        return [
          join(process.env.APPDATA || "", "obs-studio", "basic", "scripts"),
          join(process.env.APPDATA || "", "obs-studio", "scripts"),
        ];

      case "darwin":
        return [
          join(homedir(), "Library", "Application Support", "obs-studio", "scripts"),
        ];

      case "linux":
        return [
          join(homedir(), ".config", "obs-studio", "basic", "scripts"),
          join(homedir(), ".config", "obs-studio", "scripts"),
        ];

      default:
        return [];
    }
  }

  /**
   * Get all OBS directories
   */
  getAllDirectories(): string[] {
    return [...this.getPluginDirectories(), ...this.getScriptDirectories()];
  }
}


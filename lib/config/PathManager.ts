import { homedir, platform } from "os";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { AppConfig } from "./AppConfig";

/**
 * PathManager handles all application paths including user data directories
 */
export class PathManager {
  private static instance: PathManager;
  private appConfig: AppConfig;
  private dataDir: string;

  private constructor() {
    this.appConfig = AppConfig.getInstance();
    this.dataDir = this.resolveDataDir();
    this.ensureDirectories();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): PathManager {
    if (!PathManager.instance) {
      PathManager.instance = new PathManager();
    }
    return PathManager.instance;
  }

  /**
   * Resolve the data directory path
   */
  private resolveDataDir(): string {
    const configPath = this.appConfig.dataDir;
    return configPath.startsWith("~")
      ? join(homedir(), configPath.slice(1))
      : configPath;
  }

  /**
   * Ensure all required directories exist
   */
  private ensureDirectories(): void {
    const dirs = [
      this.dataDir,
      this.getProfilesDir(),
      this.getAssetsDir(),
      this.getPostersDir(),
      this.getAvatarsDir(),
      this.getLogsDir(),
      this.getBackupsDir(),
    ];

    for (const dir of dirs) {
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
    }
  }

  /**
   * Get the main data directory
   */
  getDataDir(): string {
    return this.dataDir;
  }

  /**
   * Get the database file path
   */
  getDatabasePath(): string {
    return join(this.dataDir, "data.db");
  }

  /**
   * Get the profiles directory
   */
  getProfilesDir(): string {
    return join(this.dataDir, "profiles");
  }

  /**
   * Get the assets directory
   */
  getAssetsDir(): string {
    return join(this.dataDir, "assets");
  }

  /**
   * Get the posters directory
   */
  getPostersDir(): string {
    return join(this.getAssetsDir(), "posters");
  }

  /**
   * Get the avatars directory
   */
  getAvatarsDir(): string {
    return join(this.getAssetsDir(), "avatars");
  }

  /**
   * Get the logs directory
   */
  getLogsDir(): string {
    return join(this.dataDir, "logs");
  }

  /**
   * Get the backups directory
   */
  getBackupsDir(): string {
    return join(this.dataDir, "backups");
  }

  /**
   * Get OBS plugin paths based on platform
   */
  getOBSPluginPaths(): string[] {
    const currentPlatform = platform();

    switch (currentPlatform) {
      case "win32":
        return [
          "C:\\Program Files\\obs-studio\\obs-plugins",
          join(process.env.APPDATA || "", "obs-studio", "basic", "scripts"),
        ];
      case "darwin":
        return [
          "/Applications/OBS.app/Contents/Resources/obs-plugins",
          join(homedir(), "Library", "Application Support", "obs-studio", "scripts"),
        ];
      case "linux":
        return [
          "/usr/lib/obs-plugins",
          join(homedir(), ".config", "obs-studio", "basic", "scripts"),
        ];
      default:
        return [];
    }
  }
}


import { z } from "zod";
import { platform, homedir } from "os";
import { join } from "path";
import { existsSync } from "fs";

/**
 * Determine if we're running in development mode
 */
function isDevelopment(): boolean {
  return process.env.NODE_ENV !== "production";
}

/**
 * Get the project root directory
 * Uses process.cwd() and verifies package.json exists
 */
function getProjectRoot(): string | null {
  const cwd = process.cwd();
  if (existsSync(join(cwd, "package.json"))) {
    return cwd;
  }
  return null;
}

/**
 * Get default data directory based on environment
 * - Development: .appdata/obs-live-suite in project root
 * - Production: Platform-specific user data directory
 */
function getDefaultDataDir(): string {
  // Dev mode: use .appdata in project root
  if (isDevelopment()) {
    const projectRoot = getProjectRoot();
    if (projectRoot) {
      return join(projectRoot, ".appdata", "obs-live-suite");
    }
  }

  // Prod mode: platform-specific directory
  const currentPlatform = platform();
  switch (currentPlatform) {
    case "win32":
      return join(
        process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
        "obs-live-suite"
      );
    case "darwin":
      return join(
        homedir(),
        "Library",
        "Application Support",
        "obs-live-suite"
      );
    case "linux":
    default:
      return join(homedir(), ".config", "obs-live-suite");
  }
}

const defaultDataDir = getDefaultDataDir();

/**
 * Environment variable schema
 */
const envSchema = z.object({
  OBS_WEBSOCKET_URL: z.string().default("ws://localhost:4455"),
  OBS_WEBSOCKET_PASSWORD: z.string().optional(),
  APP_PORT: z.string().default("3000"),
  APP_HOST: z.string().default("localhost"),
  WEBSOCKET_PORT: z.string().default("3003"),
  STREAMDECK_ENABLED: z.string().default("true"),
  STREAMDECK_BASE_URL: z.string().default("http://localhost:3000"),
  CSRF_SECRET: z.string().optional(),
  AUTH_TOKEN: z.string().optional(),
  DATA_DIR: z.string().default(defaultDataDir),
  DATABASE_PATH: z.string().default(join(defaultDataDir, "data.db")),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  LOG_FILE: z.string().default(join(defaultDataDir, "logs", "app.log")),
  GITHUB_TOKEN: z.string().optional(),
  REGISTRY_UPDATE_INTERVAL: z.string().default("86400"),
  /**
   * YouTube Data API v3 key for fetching video metadata
   * Get your API key from: https://console.cloud.google.com/apis/credentials
   * Enable YouTube Data API v3 in your Google Cloud project
   */
  YOUTUBE_API_KEY: z.string().optional(),
});

/**
 * Application configuration singleton
 * Loads and validates environment variables
 */
export class AppConfig {
  private static instance: AppConfig;
  private config: z.infer<typeof envSchema>;

  private constructor() {
    this.config = envSchema.parse(process.env);
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  /**
   * Get OBS WebSocket URL
   */
  get obsWebSocketUrl(): string {
    return this.config.OBS_WEBSOCKET_URL;
  }

  /**
   * Get OBS WebSocket password
   */
  get obsWebSocketPassword(): string | undefined {
    return this.config.OBS_WEBSOCKET_PASSWORD;
  }

  /**
   * Get application port
   */
  get appPort(): number {
    return parseInt(this.config.APP_PORT, 10);
  }

  /**
   * Get application host
   */
  get appHost(): string {
    return this.config.APP_HOST;
  }

  /**
   * Get WebSocket port
   */
  get websocketPort(): number {
    return parseInt(this.config.WEBSOCKET_PORT, 10);
  }

  /**
   * Check if Stream Deck integration is enabled
   */
  get streamDeckEnabled(): boolean {
    return this.config.STREAMDECK_ENABLED === "true";
  }

  /**
   * Get Stream Deck base URL
   */
  get streamDeckBaseUrl(): string {
    return this.config.STREAMDECK_BASE_URL;
  }

  /**
   * Get CSRF secret
   */
  get csrfSecret(): string | undefined {
    return this.config.CSRF_SECRET;
  }

  /**
   * Get auth token for LAN mode
   */
  get authToken(): string | undefined {
    return this.config.AUTH_TOKEN;
  }

  /**
   * Get data directory path
   */
  get dataDir(): string {
    return this.config.DATA_DIR;
  }

  /**
   * Get database path
   */
  get databasePath(): string {
    return this.config.DATABASE_PATH;
  }

  /**
   * Get log level
   */
  get logLevel(): string {
    return this.config.LOG_LEVEL;
  }

  /**
   * Get log file path
   */
  get logFile(): string {
    return this.config.LOG_FILE;
  }

  /**
   * Get GitHub token (optional, for higher rate limits)
   */
  get githubToken(): string | undefined {
    return this.config.GITHUB_TOKEN;
  }

  /**
   * Get registry update interval in seconds
   */
  get registryUpdateInterval(): number {
    return parseInt(this.config.REGISTRY_UPDATE_INTERVAL, 10);
  }

  /**
   * Get YouTube Data API v3 key (optional)
   */
  get youtubeApiKey(): string | undefined {
    return this.config.YOUTUBE_API_KEY;
  }
}


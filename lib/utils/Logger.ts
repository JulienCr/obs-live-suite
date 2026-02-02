/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

/**
 * Numeric priority for log levels (higher = more severe)
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
};

/**
 * Parse a log level string (case-insensitive)
 */
function parseLogLevel(level: string | undefined): LogLevel | null {
  if (!level) return null;
  const normalized = level.toLowerCase().trim();
  if (normalized === "debug") return LogLevel.DEBUG;
  if (normalized === "info") return LogLevel.INFO;
  if (normalized === "warn" || normalized === "warning") return LogLevel.WARN;
  if (normalized === "error") return LogLevel.ERROR;
  return null;
}

/**
 * ANSI color codes for terminal output
 */
const ANSI = {
  reset: "\x1b[0m",
  gray: "\x1b[90m",
  blue: "\x1b[94m",
  orange: "\x1b[33m", // Yellow/orange (closest to orange in ANSI)
  red: "\x1b[31m",
} as const;

/**
 * Get the color code for a log level
 */
function getColorForLevel(level: LogLevel): string {
  switch (level) {
    case LogLevel.DEBUG:
      return ANSI.gray;
    case LogLevel.INFO:
      return ANSI.blue;
    case LogLevel.WARN:
      return ANSI.orange;
    case LogLevel.ERROR:
      return ANSI.red;
  }
}

// Detect if we're running in a browser environment
const isBrowser = typeof window !== "undefined";

// Dynamic fs functions - only available server-side
let fsExists: ((path: string) => boolean) | null = null;
let fsMkdir: ((path: string, options?: { recursive?: boolean }) => void) | null = null;
let fsAppend: ((path: string, data: string, options?: { encoding: string }) => void) | null = null;
let pathDirname: ((path: string) => string) | null = null;

// Load fs module only on server-side
// Use eval to hide the require from webpack static analysis
if (!isBrowser) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, no-eval
    const dynamicRequire = eval("require");
    const fs = dynamicRequire("fs");
    const path = dynamicRequire("path");
    fsExists = fs.existsSync;
    fsMkdir = fs.mkdirSync;
    fsAppend = fs.appendFileSync;
    pathDirname = path.dirname;
  } catch {
    // fs not available, file logging disabled
  }
}

/**
 * Logger utility class for structured logging throughout the application
 * Writes to both console and log files for persistence (server-side only)
 * Falls back to console-only logging in browser environments
 */
export class Logger {
  private context: string;
  private level: LogLevel;
  private static logFilePath: string | null = null;
  private static isFileLoggingEnabled = !isBrowser;

  /**
   * Global log level - applies to all loggers unless overridden per-instance.
   * Set via LOG_LEVEL environment variable or Logger.setGlobalLevel()
   */
  private static globalLevel: LogLevel = LogLevel.INFO;

  /**
   * Per-context log level overrides.
   * Set via LOG_LEVEL_<CONTEXT> env vars or Logger.setContextLevel()
   * Example: LOG_LEVEL_OBSConnectionManager=debug
   */
  private static contextLevels: Map<string, LogLevel> = new Map();

  /**
   * Whether the global level has been initialized from environment
   */
  private static initialized = false;

  constructor(context: string, level?: LogLevel) {
    this.context = context;
    // Priority: explicit level > context-specific > global
    this.level = level ?? Logger.getEffectiveLevel(context);
  }

  /**
   * Initialize log levels from environment variables.
   * Called automatically on first Logger creation, but can be called explicitly.
   *
   * Environment variables:
   * - LOG_LEVEL: Global level (debug, info, warn, error)
   * - LOG_LEVEL_<Context>: Per-context level (e.g., LOG_LEVEL_OBSConnectionManager=debug)
   */
  static initFromEnv(): void {
    if (Logger.initialized || isBrowser) return;

    // Parse global level from LOG_LEVEL
    const globalLevelStr = process.env.LOG_LEVEL;
    const parsedGlobal = parseLogLevel(globalLevelStr);
    if (parsedGlobal) {
      Logger.globalLevel = parsedGlobal;
    }

    // Parse context-specific levels from LOG_LEVEL_*
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith("LOG_LEVEL_") && key !== "LOG_LEVEL") {
        const contextName = key.substring("LOG_LEVEL_".length);
        const parsedLevel = parseLogLevel(value);
        if (parsedLevel && contextName) {
          Logger.contextLevels.set(contextName, parsedLevel);
        }
      }
    }

    Logger.initialized = true;
  }

  /**
   * Set the global log level programmatically
   */
  static setGlobalLevel(level: LogLevel): void {
    Logger.globalLevel = level;
  }

  /**
   * Get the current global log level
   */
  static getGlobalLevel(): LogLevel {
    if (!Logger.initialized) Logger.initFromEnv();
    return Logger.globalLevel;
  }

  /**
   * Set a context-specific log level
   */
  static setContextLevel(context: string, level: LogLevel): void {
    Logger.contextLevels.set(context, level);
  }

  /**
   * Get the effective log level for a context
   */
  private static getEffectiveLevel(context: string): LogLevel {
    if (!Logger.initialized) Logger.initFromEnv();
    return Logger.contextLevels.get(context) ?? Logger.globalLevel;
  }

  /**
   * Set the log file path for all Logger instances
   * Call this early in your application startup (server-side only)
   */
  static setLogFilePath(path: string): void {
    if (isBrowser || !pathDirname || !fsExists || !fsMkdir) {
      // File logging not available in browser
      return;
    }

    Logger.logFilePath = path;

    // Ensure log directory exists
    const logDir = pathDirname(path);
    if (!fsExists(logDir)) {
      try {
        fsMkdir(logDir, { recursive: true });
      } catch (err) {
        console.error(`[Logger] Failed to create log directory: ${logDir}`, err);
        Logger.isFileLoggingEnabled = false;
      }
    }
  }

  /**
   * Write a log entry to file (server-side only)
   */
  private writeToFile(level: string, message: string, data?: unknown): void {
    if (!Logger.isFileLoggingEnabled || !Logger.logFilePath || !fsAppend) {
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const dataStr = data ? ` | ${JSON.stringify(data)}` : "";
      const logLine = `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${dataStr}\n`;

      fsAppend(Logger.logFilePath, logLine, { encoding: "utf-8" });
    } catch (err) {
      // Fail silently for file writes to avoid infinite loops
      // Only log to console
      console.error(`[Logger] Failed to write to log file:`, err);
    }
  }

  /**
   * Format the context with color based on log level
   */
  private formatContext(level: LogLevel): string {
    if (isBrowser) {
      // No ANSI colors in browser
      return `[${this.context}]`;
    }
    const color = getColorForLevel(level);
    return `${color}[${this.context}]${ANSI.reset}`;
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(`${this.formatContext(LogLevel.DEBUG)} ${message}`, data || "");
      this.writeToFile("debug", message, data);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`${this.formatContext(LogLevel.INFO)} ${message}`, data || "");
      this.writeToFile("info", message, data);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`${this.formatContext(LogLevel.WARN)} ${message}`, data || "");
      this.writeToFile("warn", message, data);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`${this.formatContext(LogLevel.ERROR)} ${message}`, error || "");
      this.writeToFile("error", message, error);
    }
  }

  /**
   * Check if a message should be logged based on current level
   */
  private shouldLog(messageLevel: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[messageLevel] >= LOG_LEVEL_PRIORITY[this.level];
  }
}


/**
 * Log levels for structured logging
 */
export enum LogLevel {
  DEBUG = "debug",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}

// Detect if we're running in a browser environment
const isBrowser = typeof window !== "undefined";

// Dynamic fs functions - only available server-side
let fsExists: ((path: string) => boolean) | null = null;
let fsMkdir: ((path: string, options?: { recursive?: boolean }) => void) | null = null;
let fsAppend: ((path: string, data: string, options?: { encoding: string }) => void) | null = null;
let pathDirname: ((path: string) => string) | null = null;

// Load fs module only on server-side
if (!isBrowser) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require("fs");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require("path");
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

  constructor(context: string, level: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.level = level;
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
   * Log a debug message
   */
  debug(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(`[${this.context}] ${message}`, data || "");
      this.writeToFile("debug", message, data);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`[${this.context}] ${message}`, data || "");
      this.writeToFile("info", message, data);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: unknown): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[${this.context}] ${message}`, data || "");
      this.writeToFile("warn", message, data);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, error?: unknown): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[${this.context}] ${message}`, error || "");
      this.writeToFile("error", message, error);
    }
  }

  /**
   * Check if a message should be logged based on current level
   */
  private shouldLog(messageLevel: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    return levels.indexOf(messageLevel) >= levels.indexOf(this.level);
  }
}


import { existsSync, mkdirSync, appendFileSync } from "fs";
import { dirname } from "path";

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
 * Logger utility class for structured logging throughout the application
 * Writes to both console and log files for persistence
 */
export class Logger {
  private context: string;
  private level: LogLevel;
  private static logFilePath: string | null = null;
  private static isFileLoggingEnabled = true;

  constructor(context: string, level: LogLevel = LogLevel.INFO) {
    this.context = context;
    this.level = level;
  }

  /**
   * Set the log file path for all Logger instances
   * Call this early in your application startup
   */
  static setLogFilePath(path: string): void {
    Logger.logFilePath = path;
    
    // Ensure log directory exists
    const logDir = dirname(path);
    if (!existsSync(logDir)) {
      try {
        mkdirSync(logDir, { recursive: true });
      } catch (err) {
        console.error(`[Logger] Failed to create log directory: ${logDir}`, err);
        Logger.isFileLoggingEnabled = false;
      }
    }
  }

  /**
   * Write a log entry to file
   */
  private writeToFile(level: string, message: string, data?: unknown): void {
    if (!Logger.isFileLoggingEnabled || !Logger.logFilePath) {
      return;
    }

    try {
      const timestamp = new Date().toISOString();
      const dataStr = data ? ` | ${JSON.stringify(data)}` : "";
      const logLine = `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}${dataStr}\n`;
      
      appendFileSync(Logger.logFilePath, logLine, { encoding: "utf-8" });
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


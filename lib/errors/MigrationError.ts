/**
 * Error codes for database migration failures
 */
export enum MigrationErrorCode {
  /** Table does not exist - expected during initial setup */
  TABLE_NOT_FOUND = "TABLE_NOT_FOUND",
  /** Column already exists - migration already applied */
  COLUMN_EXISTS = "COLUMN_EXISTS",
  /** Generic SQL syntax or execution error */
  SQL_ERROR = "SQL_ERROR",
  /** Data transformation failed during migration */
  DATA_TRANSFORM_ERROR = "DATA_TRANSFORM_ERROR",
  /** Unknown error type */
  UNKNOWN = "UNKNOWN",
}

/**
 * Represents a SQLite error with code property
 */
export interface SqliteError extends Error {
  code?: string;
}

/**
 * Type guard to check if an error is a SQLite error
 */
export function isSqliteError(error: unknown): error is SqliteError {
  return error instanceof Error && "code" in error;
}

/**
 * Determine the migration error code based on the error message/code
 */
export function getMigrationErrorCode(error: unknown): MigrationErrorCode {
  if (!isSqliteError(error)) {
    return MigrationErrorCode.UNKNOWN;
  }

  const message = error.message?.toLowerCase() ?? "";

  // Table doesn't exist - common during first run before tables are created
  if (
    message.includes("no such table") ||
    message.includes("table") && message.includes("does not exist")
  ) {
    return MigrationErrorCode.TABLE_NOT_FOUND;
  }

  // Column already exists - migration was already applied
  if (
    message.includes("duplicate column name") ||
    message.includes("column") && message.includes("already exists")
  ) {
    return MigrationErrorCode.COLUMN_EXISTS;
  }

  // General SQL errors
  if (error.code === "SQLITE_ERROR") {
    return MigrationErrorCode.SQL_ERROR;
  }

  return MigrationErrorCode.UNKNOWN;
}

/**
 * Custom error class for database migrations
 */
export class MigrationError extends Error {
  public readonly code: MigrationErrorCode;
  public readonly migrationName: string;
  public readonly tableName: string;
  public readonly operation: string;
  public readonly originalError: unknown;
  public readonly isRecoverable: boolean;

  constructor(options: {
    migrationName: string;
    tableName: string;
    operation: string;
    originalError: unknown;
    code?: MigrationErrorCode;
  }) {
    const code = options.code ?? getMigrationErrorCode(options.originalError);
    const originalMessage =
      options.originalError instanceof Error
        ? options.originalError.message
        : String(options.originalError);

    super(
      `Migration "${options.migrationName}" failed during ${options.operation} on table "${options.tableName}": ${originalMessage}`
    );

    this.name = "MigrationError";
    this.code = code;
    this.migrationName = options.migrationName;
    this.tableName = options.tableName;
    this.operation = options.operation;
    this.originalError = options.originalError;

    // Determine if error is recoverable
    // TABLE_NOT_FOUND is recoverable if we're adding columns (table will be created)
    // COLUMN_EXISTS is recoverable (migration already applied)
    // SQL_ERROR and UNKNOWN are not recoverable
    this.isRecoverable =
      code === MigrationErrorCode.TABLE_NOT_FOUND ||
      code === MigrationErrorCode.COLUMN_EXISTS;
  }

  /**
   * Format error for logging with full context
   */
  toLogObject(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      migrationName: this.migrationName,
      tableName: this.tableName,
      operation: this.operation,
      message: this.message,
      isRecoverable: this.isRecoverable,
      originalError:
        this.originalError instanceof Error
          ? {
              name: this.originalError.name,
              message: this.originalError.message,
              stack: this.originalError.stack,
            }
          : this.originalError,
    };
  }
}

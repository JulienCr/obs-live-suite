import Database from "better-sqlite3";
import { Logger } from "../utils/Logger";
import {
  MigrationError,
  MigrationErrorCode,
} from "../errors/MigrationError";

/**
 * Column migration definition for declarative column additions
 */
export interface ColumnMigration {
  /** Unique migration name for tracking */
  name: string;
  /** Table to add the column to */
  table: string;
  /** Column name to add */
  column: string;
  /** Column definition (e.g., "INTEGER NOT NULL DEFAULT 1") */
  definition: string;
}

/**
 * Table migration definition for declarative table creation
 */
export interface TableMigration {
  /** Unique migration name for tracking */
  name: string;
  /** Table name to create */
  table: string;
  /** Full CREATE TABLE SQL (without IF NOT EXISTS - handled automatically) */
  createSql: string;
  /** Optional indexes to create after table creation */
  indexes?: string[];
}

/**
 * Custom migration definition for complex migrations that cannot be declared
 */
export interface CustomMigration {
  /** Unique migration name for tracking */
  name: string;
  /** Primary table affected (for logging/error context) */
  table: string;
  /** Migration function returning true if changes were made */
  run: () => boolean;
}

/**
 * Result of running a single migration
 */
export interface MigrationResult {
  name: string;
  applied: boolean;
  skipped: boolean;
  error?: MigrationError;
}

/**
 * Summary of running multiple migrations
 */
export interface MigrationSummary {
  total: number;
  applied: number;
  skipped: number;
  errors: number;
  results: MigrationResult[];
}

/**
 * MigrationRunner provides declarative helpers for common database migration patterns.
 *
 * This service reduces boilerplate for:
 * - Adding columns to existing tables
 * - Creating new tables with indexes
 * - Running custom migrations with proper error handling
 *
 * Usage:
 * ```typescript
 * const runner = new MigrationRunner(db, logger);
 *
 * // Declarative column migrations
 * runner.runColumnMigrations([
 *   { name: "guests_isEnabled", table: "guests", column: "isEnabled", definition: "INTEGER NOT NULL DEFAULT 1" },
 *   { name: "guests_chatMessage", table: "guests", column: "chatMessage", definition: "TEXT" },
 * ]);
 *
 * // Declarative table migrations
 * runner.runTableMigrations([
 *   { name: "wikipedia_cache_table", table: "wikipedia_cache", createSql: "CREATE TABLE..." },
 * ]);
 *
 * // Custom migrations for complex logic
 * runner.runCustomMigration({
 *   name: "themes_freeTextMaxWidth_data",
 *   table: "themes",
 *   run: () => { ... },
 * });
 * ```
 */
export class MigrationRunner {
  private db: Database.Database;
  private logger: Logger;

  constructor(db: Database.Database, logger: Logger) {
    this.db = db;
    this.logger = logger;
  }

  /**
   * Run multiple column migrations declaratively.
   * Each migration adds a column if it doesn't exist.
   */
  runColumnMigrations(migrations: ColumnMigration[]): MigrationSummary {
    const results: MigrationResult[] = [];

    for (const migration of migrations) {
      const result = this.runColumnMigration(migration);
      results.push(result);
    }

    return this.createSummary(results);
  }

  /**
   * Run a single column migration.
   * Adds the column if it doesn't exist.
   */
  runColumnMigration(migration: ColumnMigration): MigrationResult {
    const { name, table, column, definition } = migration;

    try {
      const hasColumn = this.columnExists(table, column);

      if (hasColumn) {
        return { name, applied: false, skipped: true };
      }

      this.logger.debug(`Adding ${column} column to ${table} table`);
      this.db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
      this.logger.debug(`Migration "${name}" applied successfully`);

      return { name, applied: true, skipped: false };
    } catch (error) {
      return this.handleMigrationError(name, table, "ALTER TABLE ADD COLUMN", error);
    }
  }

  /**
   * Run multiple table migrations declaratively.
   * Each migration creates a table if it doesn't exist.
   */
  runTableMigrations(migrations: TableMigration[]): MigrationSummary {
    const results: MigrationResult[] = [];

    for (const migration of migrations) {
      const result = this.runTableMigration(migration);
      results.push(result);
    }

    return this.createSummary(results);
  }

  /**
   * Run a single table migration.
   * Creates the table if it doesn't exist.
   */
  runTableMigration(migration: TableMigration): MigrationResult {
    const { name, table, createSql, indexes } = migration;

    try {
      const exists = this.tableExists(table);

      if (exists) {
        return { name, applied: false, skipped: true };
      }

      this.logger.debug(`Creating ${table} table`);
      this.db.exec(createSql);

      // Create indexes if provided
      if (indexes && indexes.length > 0) {
        for (const indexSql of indexes) {
          this.db.exec(indexSql);
        }
      }

      this.logger.debug(`Migration "${name}" applied successfully`);
      return { name, applied: true, skipped: false };
    } catch (error) {
      return this.handleMigrationError(name, table, "CREATE TABLE", error);
    }
  }

  /**
   * Run a custom migration with proper error handling.
   * Use this for complex migrations that cannot be expressed declaratively.
   */
  runCustomMigration(migration: CustomMigration): MigrationResult {
    const { name, table, run } = migration;

    try {
      const applied = run();

      if (applied) {
        this.logger.debug(`Migration "${name}" applied successfully`);
      }

      return { name, applied, skipped: !applied };
    } catch (error) {
      return this.handleMigrationError(name, table, "custom migration", error);
    }
  }

  /**
   * Run multiple custom migrations.
   */
  runCustomMigrations(migrations: CustomMigration[]): MigrationSummary {
    const results: MigrationResult[] = [];

    for (const migration of migrations) {
      const result = this.runCustomMigration(migration);
      results.push(result);
    }

    return this.createSummary(results);
  }

  /**
   * Check if a column exists in a table.
   */
  columnExists(table: string, column: string): boolean {
    const tableInfo = this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
    return tableInfo.some((col) => col.name === column);
  }

  /**
   * Check if a table exists.
   */
  tableExists(table: string): boolean {
    const tables = this.db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?")
      .all(table) as Array<{ name: string }>;
    return tables.length > 0;
  }

  /**
   * Get table column information.
   */
  getTableInfo(table: string): Array<{ name: string; type: string; notnull: number; dflt_value: string | null; pk: number }> {
    return this.db.prepare(`PRAGMA table_info(${table})`).all() as Array<{
      name: string;
      type: string;
      notnull: number;
      dflt_value: string | null;
      pk: number;
    }>;
  }

  /**
   * Handle migration error with proper logging and error wrapping.
   */
  private handleMigrationError(
    name: string,
    table: string,
    operation: string,
    error: unknown
  ): MigrationResult {
    const migrationError = new MigrationError({
      migrationName: name,
      tableName: table,
      operation,
      originalError: error,
    });

    this.logger.error(`Migration failed: ${migrationError.message}`, migrationError.toLogObject());

    if (migrationError.isRecoverable) {
      const code = migrationError.code;
      if (code === MigrationErrorCode.TABLE_NOT_FOUND) {
        this.logger.warn(
          `Migration "${name}" skipped: table "${table}" does not exist yet. ` +
          `This is expected if the table will be created during initialization.`
        );
      } else if (code === MigrationErrorCode.COLUMN_EXISTS) {
        this.logger.info(
          `Migration "${name}" skipped: column already exists in table "${table}". ` +
          `This indicates the migration was already applied.`
        );
      }
      return { name, applied: false, skipped: true, error: migrationError };
    }

    // Non-recoverable error - log fatal and throw
    this.logger.error(
      `FATAL: Migration "${name}" encountered an unrecoverable error. ` +
      `Database may be in an inconsistent state. Manual intervention may be required.`
    );
    throw migrationError;
  }

  /**
   * Create a summary from migration results.
   */
  private createSummary(results: MigrationResult[]): MigrationSummary {
    return {
      total: results.length,
      applied: results.filter((r) => r.applied).length,
      skipped: results.filter((r) => r.skipped).length,
      errors: results.filter((r) => r.error).length,
      results,
    };
  }
}

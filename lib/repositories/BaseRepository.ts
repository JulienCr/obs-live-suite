import Database from "better-sqlite3";
import { DatabaseConnector } from "@/lib/services/DatabaseConnector";
import { Logger } from "@/lib/utils/Logger";
import {
  sqliteToBoolean,
  sqliteToDate,
  booleanToSqlite,
  dateToSqlite,
} from "@/lib/utils/dbTransformers";
import { safeJsonParse, safeJsonParseOptional } from "@/lib/utils/safeJsonParse";

/**
 * Configuration for a JSON column that needs parsing
 */
export interface JsonColumnConfig<T> {
  /** Column name in the database */
  column: string;
  /** Default value if parsing fails */
  defaultValue: T;
  /** Whether the column is optional (null allowed) */
  optional?: boolean;
}

/**
 * Column transformation configuration
 */
export interface ColumnTransformConfig {
  /** Columns that store boolean as INTEGER (0/1) */
  booleanColumns?: string[];
  /** Columns that store dates as ISO strings */
  dateColumns?: string[];
  /** Columns that store dates as Unix timestamps */
  timestampColumns?: string[];
  /** JSON columns with their default values */
  jsonColumns?: JsonColumnConfig<unknown>[];
}

/**
 * Abstract base repository with common CRUD operations and row transformation.
 * Extend this class and implement the abstract properties and methods.
 *
 * @example
 * class MyRepository extends BaseRepository<MyEntity, MyRow, MyInput, MyUpdate> {
 *   protected tableName = "my_table";
 *   protected loggerName = "MyRepository";
 *   protected transformConfig = {
 *     booleanColumns: ["isActive"],
 *     dateColumns: ["createdAt", "updatedAt"],
 *   };
 *
 *   protected getOrderBy(): string {
 *     return "name ASC";
 *   }
 * }
 */
export abstract class BaseRepository<
  TEntity,
  TRow extends Record<string, unknown>,
  TInput,
  TUpdate
> {
  protected logger!: Logger;
  private _rawDb?: Database.Database;

  /**
   * Table name in the database
   */
  protected abstract readonly tableName: string;

  /**
   * Logger name for this repository
   */
  protected abstract readonly loggerName: string;

  /**
   * Column transformation configuration
   */
  protected abstract readonly transformConfig: ColumnTransformConfig;

  protected constructor() {
    // Logger is initialized lazily to avoid accessing abstract property in constructor
  }

  /**
   * Get the logger instance (lazy initialization)
   */
  protected getLogger(): Logger {
    if (!this.logger) {
      this.logger = new Logger(this.loggerName);
    }
    return this.logger;
  }

  /**
   * Get the raw database connection (lazy initialization)
   */
  protected get rawDb(): Database.Database {
    if (!this._rawDb) {
      this._rawDb = DatabaseConnector.getInstance().getDb();
    }
    return this._rawDb;
  }

  /**
   * Get the ORDER BY clause for list queries.
   * Override to customize ordering.
   */
  protected getOrderBy(): string {
    return "id ASC";
  }

  /**
   * Transform a raw database row to the entity type.
   * Uses the transformConfig to automatically convert types.
   */
  protected transformRow(row: TRow): TEntity {
    const result = { ...row } as Record<string, unknown>;

    // Transform boolean columns
    if (this.transformConfig.booleanColumns) {
      for (const col of this.transformConfig.booleanColumns) {
        if (col in result) {
          result[col] = sqliteToBoolean(result[col] as number);
        }
      }
    }

    // Transform date columns (ISO strings)
    if (this.transformConfig.dateColumns) {
      for (const col of this.transformConfig.dateColumns) {
        if (col in result) {
          result[col] = sqliteToDate(result[col] as string);
        }
      }
    }

    // Transform timestamp columns (Unix timestamps)
    if (this.transformConfig.timestampColumns) {
      for (const col of this.transformConfig.timestampColumns) {
        if (col in result && result[col] !== null) {
          result[col] = new Date(result[col] as number);
        }
      }
    }

    // Transform JSON columns
    if (this.transformConfig.jsonColumns) {
      for (const config of this.transformConfig.jsonColumns) {
        if (config.column in result) {
          const value = result[config.column] as string | null;
          if (config.optional) {
            result[config.column] = safeJsonParseOptional(value) ?? config.defaultValue;
          } else {
            result[config.column] = safeJsonParse(value || "", config.defaultValue);
          }
        }
      }
    }

    return result as TEntity;
  }

  /**
   * Prepare a value for database insertion.
   * Converts booleans, dates, and objects to SQLite-compatible values.
   */
  protected prepareValue(value: unknown): unknown {
    if (value === undefined) {
      return null;
    }
    if (typeof value === "boolean") {
      return booleanToSqlite(value);
    }
    if (value instanceof Date) {
      return dateToSqlite(value);
    }
    if (Array.isArray(value) || (typeof value === "object" && value !== null)) {
      return JSON.stringify(value);
    }
    return value;
  }

  /**
   * Get all entities from the table.
   */
  getAll(): TEntity[] {
    const stmt = this.rawDb.prepare(
      `SELECT * FROM ${this.tableName} ORDER BY ${this.getOrderBy()}`
    );
    const rows = stmt.all() as TRow[];
    return rows.map((row) => this.transformRow(row));
  }

  /**
   * Get entity by ID.
   */
  getById(id: string): TEntity | null {
    const stmt = this.rawDb.prepare(
      `SELECT * FROM ${this.tableName} WHERE id = ?`
    );
    const row = stmt.get(id) as TRow | undefined;
    if (!row) return null;
    return this.transformRow(row);
  }

  /**
   * Delete entity by ID.
   */
  delete(id: string): void {
    const stmt = this.rawDb.prepare(
      `DELETE FROM ${this.tableName} WHERE id = ?`
    );
    stmt.run(id);
  }

  /**
   * Create a new entity.
   * Must be implemented by subclasses to handle specific column mappings.
   */
  abstract create(input: TInput): void;

  /**
   * Update an existing entity.
   * Must be implemented by subclasses to handle specific column mappings.
   */
  abstract update(id: string, updates: TUpdate): void;

  /**
   * Check if an entity exists by ID.
   */
  exists(id: string): boolean {
    const stmt = this.rawDb.prepare(
      `SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`
    );
    return stmt.get(id) !== undefined;
  }

  /**
   * Count total entities in the table.
   */
  count(): number {
    const stmt = this.rawDb.prepare(
      `SELECT COUNT(*) as count FROM ${this.tableName}`
    );
    const result = stmt.get() as { count: number };
    return result.count;
  }
}

/**
 * Base repository for entities with an isEnabled flag.
 * Adds filtered getAll method.
 */
export abstract class EnabledBaseRepository<
  TEntity extends { isEnabled: boolean },
  TRow extends Record<string, unknown>,
  TInput,
  TUpdate
> extends BaseRepository<TEntity, TRow, TInput, TUpdate> {
  /**
   * Get all entities with optional enabled filter.
   * @param enabled - If true, return only enabled. If false, return only disabled. If undefined, return all.
   */
  override getAll(enabled?: boolean): TEntity[] {
    if (enabled === undefined) {
      return super.getAll();
    }

    const stmt = this.rawDb.prepare(
      `SELECT * FROM ${this.tableName} WHERE isEnabled = ? ORDER BY ${this.getOrderBy()}`
    );
    const rows = stmt.all(enabled ? 1 : 0) as TRow[];
    return rows.map((row) => this.transformRow(row));
  }
}


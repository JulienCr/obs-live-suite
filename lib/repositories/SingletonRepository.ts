import { DatabaseConnector } from "@/lib/services/DatabaseConnector";
import { Logger } from "@/lib/utils/Logger";
import type Database from "better-sqlite3";

/**
 * Lightweight base class for repositories that need singleton pattern
 * and database access but don't fit the full CRUD contract of BaseRepository.
 *
 * Provides:
 * - `rawDb` getter for database access (lazy, via DatabaseConnector)
 * - `logger` getter for structured logging (lazy, named after the subclass)
 *
 * Each subclass must still define its own static `instance` field and
 * `getInstance()` method since TypeScript doesn't support abstract statics.
 */
export abstract class SingletonRepository {
  private _logger: Logger | null = null;

  protected get rawDb(): Database.Database {
    return DatabaseConnector.getInstance().getDb();
  }

  protected get logger(): Logger {
    if (!this._logger) {
      this._logger = new Logger(this.constructor.name);
    }
    return this._logger;
  }
}

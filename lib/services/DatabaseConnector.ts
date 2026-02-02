import Database from "better-sqlite3";
import { PathManager } from "../config/PathManager";
import { Logger } from "../utils/Logger";

/**
 * DatabaseConnector handles the raw SQLite database connection.
 * This is a minimal service with NO dependencies on repositories,
 * breaking the circular dependency: DatabaseService -> Repositories -> BaseRepository -> DatabaseService
 *
 * Use DatabaseService for high-level operations with table initialization and migrations.
 * Use repositories directly for entity CRUD operations.
 */
export class DatabaseConnector {
  private static instance: DatabaseConnector;
  private db: Database.Database;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger("DatabaseConnector");
    const dbPath = PathManager.getInstance().getDatabasePath();
    this.logger.info(`Initializing database connection at: ${dbPath}`);
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): DatabaseConnector {
    if (!DatabaseConnector.instance) {
      DatabaseConnector.instance = new DatabaseConnector();
    }
    return DatabaseConnector.instance;
  }

  /**
   * Get the raw database instance for direct queries
   */
  getDb(): Database.Database {
    return this.db;
  }

  /**
   * Force a WAL checkpoint to ensure all changes are visible
   * Call this before reading data that may have been written by another process
   */
  checkpoint(): void {
    this.db.pragma("wal_checkpoint(PASSIVE)");
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
    this.logger.info("Database connection closed");
  }
}

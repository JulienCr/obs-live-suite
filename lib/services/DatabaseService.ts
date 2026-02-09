import Database from "better-sqlite3";
import { DatabaseConnector } from "./DatabaseConnector";
import { Logger } from "../utils/Logger";
import { safeJsonParse } from "../utils/safeJsonParse";
import {
  MigrationRunner,
  ColumnMigration,
  CustomMigration,
} from "./MigrationRunner";

/**
 * DatabaseService handles SQLite database connection, table initialization, and migrations.
 *
 * For data-access operations, use the appropriate repository directly:
 * - GuestRepository for guests
 * - PosterRepository for posters
 * - ProfileRepository for profiles
 * - ThemeRepository for themes
 * - CueMessageRepository for cue messages
 * - SettingsRepository for key-value settings
 * - ChatMessageRepository for streamerbot chat messages
 * - PanelColorRepository for panel color customization
 * - WorkspaceRepository for workspace layouts
 * - TextPresetRepository for text presets
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database.Database;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger("DatabaseService");
    // Get database connection from DatabaseConnector (handles path and WAL mode)
    this.db = DatabaseConnector.getInstance().getDb();
    this.logger.info("Initializing database tables and migrations");
    this.initializeTables();
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Run database migrations using the declarative MigrationRunner.
   * Migrations are organized into:
   * - Column migrations: Simple column additions
   * - Custom migrations: Complex logic (data migrations, table recreations)
   */
  private runMigrations(): void {
    this.logger.debug("Starting database migrations...");

    const migrationRunner = new MigrationRunner(this.db, this.logger);

    // ==================== COLUMN MIGRATIONS ====================
    // Simple column additions that can be declared statically
    const columnMigrations: ColumnMigration[] = [
      // Themes table columns
      {
        name: "themes_lowerThirdLayout",
        table: "themes",
        column: "lowerThirdLayout",
        definition: `TEXT NOT NULL DEFAULT '{"x":60,"y":920,"scale":1}'`,
      },
      {
        name: "themes_countdownLayout",
        table: "themes",
        column: "countdownLayout",
        definition: `TEXT NOT NULL DEFAULT '{"x":960,"y":540,"scale":1}'`,
      },
      {
        name: "themes_posterLayout",
        table: "themes",
        column: "posterLayout",
        definition: `TEXT NOT NULL DEFAULT '{"x":960,"y":540,"scale":1}'`,
      },
      {
        name: "themes_lowerThirdAnimation",
        table: "themes",
        column: "lowerThirdAnimation",
        definition: `TEXT DEFAULT '{"timing":{"logoFadeDuration":200,"logoScaleDuration":200,"flipDuration":600,"flipDelay":500,"barAppearDelay":800,"barExpandDuration":450,"textAppearDelay":1000,"textFadeDuration":250},"styles":{"barBorderRadius":16,"barMinWidth":200,"avatarBorderWidth":4,"avatarBorderColor":"#272727","freeTextMaxWidth":{"left":65,"right":65,"center":90}}}'`,
      },

      // Guests table columns
      {
        name: "guests_isEnabled",
        table: "guests",
        column: "isEnabled",
        definition: "INTEGER NOT NULL DEFAULT 1",
      },
      {
        name: "guests_chatMessage",
        table: "guests",
        column: "chatMessage",
        definition: "TEXT",
      },

      // Posters table columns
      {
        name: "posters_isEnabled",
        table: "posters",
        column: "isEnabled",
        definition: "INTEGER NOT NULL DEFAULT 1",
      },
      {
        name: "posters_description",
        table: "posters",
        column: "description",
        definition: "TEXT",
      },
      {
        name: "posters_source",
        table: "posters",
        column: "source",
        definition: "TEXT",
      },
      {
        name: "posters_chatMessage",
        table: "posters",
        column: "chatMessage",
        definition: "TEXT",
      },
      {
        name: "posters_parentPosterId",
        table: "posters",
        column: "parentPosterId",
        definition: "TEXT REFERENCES posters(id)",
      },
      {
        name: "posters_startTime",
        table: "posters",
        column: "startTime",
        definition: "REAL",
      },
      {
        name: "posters_endTime",
        table: "posters",
        column: "endTime",
        definition: "REAL",
      },
      {
        name: "posters_thumbnailUrl",
        table: "posters",
        column: "thumbnailUrl",
        definition: "TEXT",
      },
      {
        name: "posters_endBehavior",
        table: "posters",
        column: "endBehavior",
        definition: "TEXT",
      },

      // Wikipedia cache columns
      {
        name: "wikipedia_cache_raw_extract",
        table: "wikipedia_cache",
        column: "raw_extract",
        definition: "TEXT",
      },

      // Rooms table columns
      {
        name: "rooms_canSendCustomMessages",
        table: "rooms",
        column: "canSendCustomMessages",
        definition: "INTEGER NOT NULL DEFAULT 0",
      },
      {
        name: "rooms_streamerbotConnection",
        table: "rooms",
        column: "streamerbotConnection",
        definition: "TEXT",
      },
      {
        name: "rooms_allowPresenterToSendMessage",
        table: "rooms",
        column: "allowPresenterToSendMessage",
        definition: "INTEGER NOT NULL DEFAULT 0",
      },

      // Panel colors columns
      {
        name: "panel_colors_scheme",
        table: "panel_colors",
        column: "scheme",
        definition: "TEXT NOT NULL DEFAULT 'neutral'",
      },
    ];

    migrationRunner.runColumnMigrations(columnMigrations);

    // ==================== CUSTOM MIGRATIONS ====================
    // Complex migrations that require custom logic

    const customMigrations: CustomMigration[] = [
      // Data migration: Update existing themes with freeTextMaxWidth
      {
        name: "themes_freeTextMaxWidth_data",
        table: "themes",
        run: () => {
          const themes = this.db.prepare("SELECT id, lowerThirdAnimation FROM themes").all() as Array<{ id: string; lowerThirdAnimation: string }>;

          let updatedCount = 0;
          for (const theme of themes) {
            const animation = safeJsonParse<Record<string, unknown>>(theme.lowerThirdAnimation, {});
            if (!animation.styles || !(animation.styles as Record<string, unknown>)?.freeTextMaxWidth) {
              if (!animation.styles) {
                animation.styles = {};
              }
              (animation.styles as Record<string, unknown>).freeTextMaxWidth = { left: 65, right: 65, center: 90 };

              this.db.prepare("UPDATE themes SET lowerThirdAnimation = ? WHERE id = ?")
                .run(JSON.stringify(animation), theme.id);
              updatedCount++;
            }
          }

          if (updatedCount > 0) {
            this.logger.debug(`Updated ${updatedCount} theme(s) with freeTextMaxWidth`);
            return true;
          }
          return false;
        },
      },

      // Table recreation: Remove roomId from cue_messages (single-room presenter system)
      {
        name: "cue_messages_remove_roomId",
        table: "cue_messages",
        run: () => {
          const tableInfo = this.db.prepare("PRAGMA table_info(cue_messages)").all() as Array<{ name: string }>;
          const hasRoomId = tableInfo.some((col) => col.name === "roomId");

          if (hasRoomId) {
            this.logger.debug("Recreating cue_messages table without roomId column");

            // SQLite doesn't support DROP COLUMN easily, so we recreate the table
            this.db.exec(`
              -- Create new table without roomId
              CREATE TABLE cue_messages_new (
                id TEXT PRIMARY KEY,
                type TEXT NOT NULL,
                fromRole TEXT NOT NULL,
                severity TEXT,
                title TEXT,
                body TEXT,
                pinned INTEGER NOT NULL DEFAULT 0,
                actions TEXT NOT NULL DEFAULT '[]',
                countdownPayload TEXT,
                contextPayload TEXT,
                questionPayload TEXT,
                seenBy TEXT NOT NULL DEFAULT '[]',
                ackedBy TEXT NOT NULL DEFAULT '[]',
                resolvedAt INTEGER,
                resolvedBy TEXT,
                createdAt INTEGER NOT NULL,
                updatedAt INTEGER NOT NULL
              );

              -- Copy data (excluding roomId)
              INSERT INTO cue_messages_new (id, type, fromRole, severity, title, body, pinned, actions, countdownPayload, contextPayload, questionPayload, seenBy, ackedBy, resolvedAt, resolvedBy, createdAt, updatedAt)
              SELECT id, type, fromRole, severity, title, body, pinned, actions, countdownPayload, contextPayload, questionPayload, seenBy, ackedBy, resolvedAt, resolvedBy, createdAt, updatedAt
              FROM cue_messages;

              -- Drop old table and indexes
              DROP INDEX IF EXISTS idx_cue_messages_roomId;
              DROP TABLE cue_messages;

              -- Rename new table
              ALTER TABLE cue_messages_new RENAME TO cue_messages;

              -- Recreate indexes (without roomId index)
              CREATE INDEX IF NOT EXISTS idx_cue_messages_createdAt ON cue_messages(createdAt);
              CREATE INDEX IF NOT EXISTS idx_cue_messages_pinned ON cue_messages(pinned);
            `);
            return true;
          }
          return false;
        },
      },

      // Index creation: Add index for sub-video lookups after column migrations
      {
        name: "posters_parentPosterId_index",
        table: "posters",
        run: () => {
          // Only create index if the column exists (it should after column migrations)
          if (migrationRunner.columnExists("posters", "parentPosterId")) {
            this.db.exec(`CREATE INDEX IF NOT EXISTS idx_posters_parentPosterId ON posters(parentPosterId);`);
            return true;
          }
          return false;
        },
      },
    ];

    migrationRunner.runCustomMigrations(customMigrations);

    this.logger.debug("Database migrations completed");
  }

  /**
   * Initialize database tables
   */
  private initializeTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS guests (
        id TEXT PRIMARY KEY,
        displayName TEXT NOT NULL,
        subtitle TEXT,
        accentColor TEXT NOT NULL,
        avatarUrl TEXT,
        isEnabled INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS posters (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        source TEXT,
        fileUrl TEXT NOT NULL,
        type TEXT NOT NULL,
        duration INTEGER,
        tags TEXT NOT NULL,
        profileIds TEXT NOT NULL,
        metadata TEXT,
        isEnabled INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS themes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        colors TEXT NOT NULL,
        lowerThirdTemplate TEXT NOT NULL,
        lowerThirdFont TEXT NOT NULL,
        lowerThirdLayout TEXT NOT NULL DEFAULT '{"x":60,"y":920,"scale":1}',
        lowerThirdAnimation TEXT DEFAULT '{"timing":{"logoFadeDuration":200,"logoScaleDuration":200,"flipDuration":600,"flipDelay":500,"barAppearDelay":800,"barExpandDuration":450,"textAppearDelay":1000,"textFadeDuration":250},"styles":{"barBorderRadius":16,"barMinWidth":200,"avatarBorderWidth":4,"avatarBorderColor":"#272727","freeTextMaxWidth":{"left":65,"right":65,"center":90}}}',
        countdownStyle TEXT NOT NULL,
        countdownFont TEXT NOT NULL,
        countdownLayout TEXT NOT NULL DEFAULT '{"x":960,"y":540,"scale":1}',
        posterLayout TEXT NOT NULL DEFAULT '{"x":960,"y":540,"scale":1}',
        isGlobal INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        themeId TEXT NOT NULL,
        dskSourceName TEXT NOT NULL,
        defaultScene TEXT,
        posterRotation TEXT NOT NULL,
        audioSettings TEXT NOT NULL,
        isActive INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        profileId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS macros (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        actions TEXT NOT NULL,
        hotkey TEXT,
        profileId TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS plugins (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        kind TEXT NOT NULL,
        localVersion TEXT,
        paths TEXT NOT NULL,
        registryId TEXT,
        latestVersion TEXT,
        releaseUrl TEXT,
        releaseNotes TEXT,
        updateStatus TEXT NOT NULL,
        isIgnored INTEGER NOT NULL,
        isWatched INTEGER NOT NULL,
        lastChecked TEXT,
        compatibleOBSVersions TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS wikipedia_cache (
        id TEXT PRIMARY KEY,
        query TEXT NOT NULL,
        lang TEXT NOT NULL DEFAULT 'fr',
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        thumbnail TEXT,
        source TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        ttl INTEGER NOT NULL DEFAULT 604800,
        raw_extract TEXT
      );

      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        vdoNinjaUrl TEXT,
        twitchChatUrl TEXT,
        quickReplies TEXT NOT NULL DEFAULT '["Ready","Need more context","Delay 1 min","Audio issue"]',
        canSendCustomMessages INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS cue_messages (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        fromRole TEXT NOT NULL,
        severity TEXT,
        title TEXT,
        body TEXT,
        pinned INTEGER NOT NULL DEFAULT 0,
        actions TEXT NOT NULL DEFAULT '[]',
        countdownPayload TEXT,
        contextPayload TEXT,
        questionPayload TEXT,
        seenBy TEXT NOT NULL DEFAULT '[]',
        ackedBy TEXT NOT NULL DEFAULT '[]',
        resolvedAt INTEGER,
        resolvedBy TEXT,
        createdAt INTEGER NOT NULL,
        updatedAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS streamerbot_chat_messages (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        platform TEXT NOT NULL,
        eventType TEXT NOT NULL DEFAULT 'message',
        channel TEXT,
        username TEXT NOT NULL,
        displayName TEXT NOT NULL,
        message TEXT NOT NULL,
        parts TEXT,
        metadata TEXT,
        createdAt INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS panel_colors (
        id TEXT PRIMARY KEY,
        panelId TEXT NOT NULL UNIQUE,
        lightBackground TEXT,
        lightHeader TEXT,
        darkBackground TEXT,
        darkHeader TEXT,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS workspaces (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        layoutJson TEXT NOT NULL,
        panelColors TEXT NOT NULL DEFAULT '{}',
        isDefault INTEGER NOT NULL DEFAULT 0,
        isBuiltIn INTEGER NOT NULL DEFAULT 0,
        sortOrder INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS text_presets (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        body TEXT NOT NULL,
        side TEXT NOT NULL DEFAULT 'left',
        imageUrl TEXT,
        imageAlt TEXT,
        isEnabled INTEGER NOT NULL DEFAULT 1,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_guests_displayName ON guests(displayName);
      CREATE INDEX IF NOT EXISTS idx_posters_profileIds ON posters(profileIds);
      CREATE INDEX IF NOT EXISTS idx_profiles_isActive ON profiles(isActive);
      CREATE INDEX IF NOT EXISTS idx_presets_profileId ON presets(profileId);
      CREATE INDEX IF NOT EXISTS idx_macros_profileId ON macros(profileId);
      CREATE INDEX IF NOT EXISTS idx_plugins_updateStatus ON plugins(updateStatus);
      CREATE INDEX IF NOT EXISTS idx_wikipedia_cache_query ON wikipedia_cache(query, lang);
      CREATE INDEX IF NOT EXISTS idx_wikipedia_cache_created_at ON wikipedia_cache(created_at);
      CREATE INDEX IF NOT EXISTS idx_rooms_name ON rooms(name);
      CREATE INDEX IF NOT EXISTS idx_cue_messages_createdAt ON cue_messages(createdAt);
      CREATE INDEX IF NOT EXISTS idx_cue_messages_pinned ON cue_messages(pinned);
      CREATE INDEX IF NOT EXISTS idx_streamerbot_chat_timestamp ON streamerbot_chat_messages(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_panel_colors_panelId ON panel_colors(panelId);
      CREATE INDEX IF NOT EXISTS idx_workspaces_name ON workspaces(name);
      CREATE INDEX IF NOT EXISTS idx_workspaces_isDefault ON workspaces(isDefault);
      CREATE INDEX IF NOT EXISTS idx_text_presets_name ON text_presets(name);
    `);

    this.logger.info("Database tables initialized");

    // Run migrations after tables are created
    this.runMigrations();
  }

  /**
   * Get the database instance
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


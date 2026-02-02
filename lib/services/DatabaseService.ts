import Database from "better-sqlite3";
import { PathManager } from "../config/PathManager";
import { Logger } from "../utils/Logger";
import { safeJsonParse, safeJsonParseOptional } from "../utils/safeJsonParse";
import { DATABASE } from "../config/Constants";
import {
  MigrationRunner,
  ColumnMigration,
  CustomMigration,
} from "./MigrationRunner";
import {
  DbGuest,
  DbGuestInput,
  DbGuestUpdate,
  DbPoster,
  DbPosterInput,
  DbPosterUpdate,
  DbProfile,
  DbProfileInput,
  DbProfileUpdate,
  DbTheme,
  DbThemeInput,
  DbThemeUpdate,



  DbCueMessage,
  DbCueMessageInput,
  DbCueMessageUpdate,
  DbStreamerbotChatMessage,
  DbStreamerbotChatMessageInput,
  DbPanelColor,
  DbPanelColorUpdate,
  DbWorkspace,
  DbWorkspaceSummary,
} from "../models/Database";
import { GuestRepository } from "@/lib/repositories/GuestRepository";
import { PosterRepository } from "@/lib/repositories/PosterRepository";
import { ProfileRepository } from "@/lib/repositories/ProfileRepository";
import { ThemeRepository } from "@/lib/repositories/ThemeRepository";
import { CueMessageRepository } from "@/lib/repositories/CueMessageRepository";

/**
 * DatabaseService handles SQLite database connections and operations
 */
export class DatabaseService {
  private static instance: DatabaseService;
  private db: Database.Database;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger("DatabaseService");
    const pathManager = PathManager.getInstance();
    const dbPath = pathManager.getDatabasePath();

    this.logger.info(`Initializing database at: ${dbPath}`);
    this.db = new Database(dbPath);
    this.db.pragma("journal_mode = WAL");
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

  // ==================== GUESTS ====================

  /**
   * Get all guests
   * @param enabled - Optional filter: true for enabled only, false for disabled only, undefined for all
   */
  getAllGuests(enabled?: boolean): DbGuest[] {
    return GuestRepository.getInstance().getAll(enabled);
  }

  /**
   * Get guest by ID
   */
  getGuestById(id: string): DbGuest | null {
    return GuestRepository.getInstance().getById(id);
  }

  /**
   * Create a new guest
   */
  createGuest(guest: DbGuestInput): void {
    GuestRepository.getInstance().create(guest);
  }

  /**
   * Update a guest
   */
  updateGuest(id: string, updates: DbGuestUpdate): void {
    GuestRepository.getInstance().update(id, updates);
  }

  /**
   * Delete a guest
   */
  deleteGuest(id: string): void {
    GuestRepository.getInstance().delete(id);
  }

  // ==================== POSTERS ====================

  /**
   * Get all posters
   * @param enabled - If true, return only enabled posters. If false, return only disabled posters. If undefined, return all.
   */
  getAllPosters(enabled?: boolean): DbPoster[] {
    return PosterRepository.getInstance().getAll(enabled);
  }

  /**
   * Get poster by ID
   */
  getPosterById(id: string): DbPoster | null {
    return PosterRepository.getInstance().getById(id);
  }

  /**
   * Create a new poster
   */
  createPoster(poster: DbPosterInput): void {
    PosterRepository.getInstance().create(poster);
  }

  /**
   * Update a poster
   */
  updatePoster(id: string, updates: DbPosterUpdate): void {
    PosterRepository.getInstance().update(id, updates);
  }

  /**
   * Delete a poster
   */
  deletePoster(id: string): void {
    PosterRepository.getInstance().delete(id);
  }

  // ==================== PROFILES ====================

  /**
   * Get all profiles
   */
  getAllProfiles(): DbProfile[] {
    return ProfileRepository.getInstance().getAll();
  }

  /**
   * Get profile by ID
   */
  getProfileById(id: string): DbProfile | null {
    return ProfileRepository.getInstance().getById(id);
  }

  /**
   * Get active profile
   */
  getActiveProfile(): DbProfile | null {
    return ProfileRepository.getInstance().getActive();
  }

  /**
   * Create a new profile
   */
  createProfile(profile: DbProfileInput): void {
    ProfileRepository.getInstance().create(profile);
  }

  /**
   * Update a profile
   */
  updateProfile(id: string, updates: DbProfileUpdate): void {
    ProfileRepository.getInstance().update(id, updates);
  }

  /**
   * Set active profile (deactivates all others)
   */
  setActiveProfile(id: string): void {
    ProfileRepository.getInstance().setActive(id);
  }

  /**
   * Delete a profile
   */
  deleteProfile(id: string): void {
    ProfileRepository.getInstance().delete(id);
  }

  // ==================== THEMES ====================

  /**
   * Get all themes
   */
  getAllThemes(): DbTheme[] {
    return ThemeRepository.getInstance().getAll();
  }

  /**
   * Get theme by ID
   */
  getThemeById(id: string): DbTheme | null {
    return ThemeRepository.getInstance().getById(id);
  }

  /**
   * Create a new theme
   */
  createTheme(theme: DbThemeInput): void {
    ThemeRepository.getInstance().create(theme);
  }

  /**
   * Update a theme
   */
  updateTheme(id: string, updates: DbThemeUpdate): void {
    ThemeRepository.getInstance().update(id, updates);
  }

  /**
   * Delete a theme
   */
  deleteTheme(id: string): void {
    ThemeRepository.getInstance().delete(id);
  }

  // ==================== SETTINGS ====================

  /**
   * Get a setting by key
   */
  getSetting(key: string): string | null {
    const stmt = this.db.prepare("SELECT value FROM settings WHERE key = ?");
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value || null;
  }

  /**
   * Set a setting value
   */
  setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)"
    );
    stmt.run(key, value, new Date().toISOString());
  }

  /**
   * Delete a setting
   */
  deleteSetting(key: string): void {
    const stmt = this.db.prepare("DELETE FROM settings WHERE key = ?");
    stmt.run(key);
  }

  /**
   * Get all settings
   */
  getAllSettings(): Record<string, string> {
    const stmt = this.db.prepare("SELECT key, value FROM settings");
    const rows = stmt.all() as Array<{ key: string; value: string }>;
    const settings: Record<string, string> = {};
    for (const row of rows) {
      settings[row.key] = row.value;
    }
    return settings;
  }

  // ==================== CUE MESSAGES ====================

  /**
   * Get recent messages with optional limit and cursor
   */
  getRecentMessages(limit: number = 50, cursor?: number): DbCueMessage[] {
    return CueMessageRepository.getInstance().getRecent(limit, cursor);
  }

  /**
   * Get all pinned messages
   */
  getPinnedMessages(): DbCueMessage[] {
    return CueMessageRepository.getInstance().getPinned();
  }

  /**
   * Get message by ID
   */
  getMessageById(id: string): DbCueMessage | null {
    return CueMessageRepository.getInstance().getById(id);
  }

  /**
   * Create a new cue message
   */
  createMessage(message: DbCueMessageInput): DbCueMessage {
    return CueMessageRepository.getInstance().create(message);
  }

  /**
   * Update a cue message
   */
  updateMessage(id: string, updates: DbCueMessageUpdate): void {
    CueMessageRepository.getInstance().update(id, updates);
  }

  /**
   * Delete a cue message
   */
  deleteMessage(id: string): void {
    CueMessageRepository.getInstance().delete(id);
  }

  /**
   * Delete old messages, keeping only the most recent N
   */
  deleteOldMessages(keepCount: number = 100): void {
    CueMessageRepository.getInstance().deleteOld(keepCount);
  }

  /**
   * Clear all cue messages (including pinned)
   */
  clearAllMessages(): void {
    CueMessageRepository.getInstance().clearAll();
  }

  // ==================== STREAMERBOT CHAT MESSAGES ====================

  private readonly CHAT_BUFFER_SIZE = DATABASE.CHAT_BUFFER_SIZE;

  /**
   * Get recent chat messages, ordered by timestamp descending
   */
  getStreamerbotChatMessages(limit: number = DATABASE.CHAT_BUFFER_SIZE): DbStreamerbotChatMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM streamerbot_chat_messages
      ORDER BY timestamp DESC
      LIMIT ?
    `);
    const rows = stmt.all(limit) as Array<Omit<DbStreamerbotChatMessage, 'parts' | 'metadata'> & {
      parts: string | null;
      metadata: string | null;
    }>;

    return rows.map((row) => ({
      ...row,
      parts: safeJsonParseOptional<DbStreamerbotChatMessage['parts']>(row.parts) ?? null,
      metadata: safeJsonParseOptional<DbStreamerbotChatMessage['metadata']>(row.metadata) ?? null,
    }));
  }

  /**
   * Insert a chat message and maintain rolling buffer (see DATABASE.CHAT_BUFFER_SIZE)
   */
  insertStreamerbotChatMessage(message: DbStreamerbotChatMessageInput): void {
    const now = Date.now();

    // Insert the new message (ignore if duplicate ID)
    const insertStmt = this.db.prepare(`
      INSERT OR IGNORE INTO streamerbot_chat_messages
      (id, timestamp, platform, eventType, channel, username, displayName, message, parts, metadata, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertStmt.run(
      message.id,
      message.timestamp,
      message.platform,
      message.eventType,
      message.channel || null,
      message.username,
      message.displayName,
      message.message,
      message.parts ? JSON.stringify(message.parts) : null,
      message.metadata ? JSON.stringify(message.metadata) : null,
      message.createdAt || now
    );

    // Enforce rolling buffer - delete oldest messages beyond limit
    this.trimStreamerbotChatBuffer();
  }

  /**
   * Trim chat buffer to maintain max CHAT_BUFFER_SIZE messages
   * Deletes oldest messages by createdAt
   */
  private trimStreamerbotChatBuffer(): void {
    const countStmt = this.db.prepare("SELECT COUNT(*) as count FROM streamerbot_chat_messages");
    const { count } = countStmt.get() as { count: number };

    if (count > this.CHAT_BUFFER_SIZE) {
      // Get the createdAt of the Nth newest message (threshold)
      const thresholdStmt = this.db.prepare(`
        SELECT createdAt FROM streamerbot_chat_messages
        ORDER BY createdAt DESC
        LIMIT 1 OFFSET ?
      `);
      const row = thresholdStmt.get(this.CHAT_BUFFER_SIZE - 1) as { createdAt: number } | undefined;

      if (row) {
        const deleteStmt = this.db.prepare(`
          DELETE FROM streamerbot_chat_messages
          WHERE createdAt < ?
        `);
        deleteStmt.run(row.createdAt);
      }
    }
  }

  /**
   * Clear all chat messages (for manual clear action)
   */
  clearStreamerbotChatMessages(): void {
    const stmt = this.db.prepare("DELETE FROM streamerbot_chat_messages");
    stmt.run();
  }

  // ==================== PANEL COLORS ====================

  /**
   * Get all panel colors
   */
  getAllPanelColors(): DbPanelColor[] {
    const stmt = this.db.prepare("SELECT * FROM panel_colors ORDER BY panelId ASC");
    const rows = stmt.all() as Array<Omit<DbPanelColor, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }>;
    return rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get panel color by panel ID
   */
  getPanelColorByPanelId(panelId: string): DbPanelColor | null {
    const stmt = this.db.prepare("SELECT * FROM panel_colors WHERE panelId = ?");
    const row = stmt.get(panelId) as (Omit<DbPanelColor, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }) | undefined;
    if (!row) return null;
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Upsert panel color scheme (create or update)
   */
  upsertPanelColor(panelId: string, scheme: string): DbPanelColor {
    const existing = this.getPanelColorByPanelId(panelId);
    const now = new Date();

    if (existing) {
      // Update existing
      const stmt = this.db.prepare(`
        UPDATE panel_colors SET scheme = ?, updatedAt = ? WHERE panelId = ?
      `);
      stmt.run(scheme, now.toISOString(), panelId);
    } else {
      // Create new
      const id = crypto.randomUUID();
      const stmt = this.db.prepare(`
        INSERT INTO panel_colors (id, panelId, scheme, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(id, panelId, scheme, now.toISOString(), now.toISOString());
    }

    return this.getPanelColorByPanelId(panelId)!;
  }

  /**
   * Delete panel color (reset to default)
   */
  deletePanelColor(panelId: string): void {
    const stmt = this.db.prepare("DELETE FROM panel_colors WHERE panelId = ?");
    stmt.run(panelId);
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
    this.logger.info("Database connection closed");
  }
}


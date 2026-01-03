import Database from "better-sqlite3";
import { PathManager } from "../config/PathManager";
import { Logger } from "../utils/Logger";
import { safeJsonParse, safeJsonParseOptional } from "../utils/safeJsonParse";
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
  DbRoom,
  DbRoomInput,
  DbRoomUpdate,
  DbCueMessage,
  DbCueMessageInput,
  DbCueMessageUpdate,
  DbStreamerbotChatMessage,
  DbStreamerbotChatMessageInput,
  DbPanelColor,
  DbPanelColorUpdate,
} from "../models/Database";

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
   * Run database migrations
   */
  private runMigrations(): void {
    // Check if layout columns exist in themes table
    try {
      const tableInfo = this.db.prepare("PRAGMA table_info(themes)").all() as Array<{ name: string }>;
      const hasLowerThirdLayout = tableInfo.some((col) => col.name === "lowerThirdLayout");
      const hasCountdownLayout = tableInfo.some((col) => col.name === "countdownLayout");
      const hasPosterLayout = tableInfo.some((col) => col.name === "posterLayout");

      if (!hasLowerThirdLayout) {
        this.logger.info("Adding lowerThirdLayout column to themes table");
        this.db.exec(`
          ALTER TABLE themes ADD COLUMN lowerThirdLayout TEXT NOT NULL DEFAULT '{"x":60,"y":920,"scale":1}';
        `);
      }

      if (!hasCountdownLayout) {
        this.logger.info("Adding countdownLayout column to themes table");
        this.db.exec(`
          ALTER TABLE themes ADD COLUMN countdownLayout TEXT NOT NULL DEFAULT '{"x":960,"y":540,"scale":1}';
        `);
      }

      if (!hasPosterLayout) {
        this.logger.info("Adding posterLayout column to themes table");
        this.db.exec(`
          ALTER TABLE themes ADD COLUMN posterLayout TEXT NOT NULL DEFAULT '{"x":960,"y":540,"scale":1}';
        `);
      }

      if (!hasLowerThirdLayout || !hasCountdownLayout || !hasPosterLayout) {
        this.logger.info("Theme table migration completed");
      }
    } catch (error) {
      this.logger.error("Migration error:", error);
      // If themes table doesn't exist yet, that's fine - it will be created
    }

    // Check if isEnabled column exists in guests table
    try {
      const guestTableInfo = this.db.prepare("PRAGMA table_info(guests)").all() as Array<{ name: string }>;
      const hasIsEnabled = guestTableInfo.some((col) => col.name === "isEnabled");

      if (!hasIsEnabled) {
        this.logger.info("Adding isEnabled column to guests table");
        this.db.exec(`
          ALTER TABLE guests ADD COLUMN isEnabled INTEGER NOT NULL DEFAULT 1;
        `);
        this.logger.info("Guests table migration completed");
      }
    } catch (error) {
      this.logger.error("Migration error for guests table:", error);
    }

    // Check if isEnabled column exists in posters table
    try {
      const posterTableInfo = this.db.prepare("PRAGMA table_info(posters)").all() as Array<{ name: string }>;
      const hasIsEnabled = posterTableInfo.some((col) => col.name === "isEnabled");

      if (!hasIsEnabled) {
        this.logger.info("Adding isEnabled column to posters table");
        this.db.exec(`
          ALTER TABLE posters ADD COLUMN isEnabled INTEGER NOT NULL DEFAULT 1;
        `);
        this.logger.info("Posters table migration completed");
      }
    } catch (error) {
      this.logger.error("Migration error for posters table:", error);
    }

    // Check if description and source columns exist in posters table
    try {
      const posterTableInfo = this.db.prepare("PRAGMA table_info(posters)").all() as Array<{ name: string }>;
      const hasDescription = posterTableInfo.some((col) => col.name === "description");
      const hasSource = posterTableInfo.some((col) => col.name === "source");

      if (!hasDescription) {
        this.logger.info("Adding description column to posters table");
        this.db.exec(`
          ALTER TABLE posters ADD COLUMN description TEXT;
        `);
      }

      if (!hasSource) {
        this.logger.info("Adding source column to posters table");
        this.db.exec(`
          ALTER TABLE posters ADD COLUMN source TEXT;
        `);
      }

      if (!hasDescription || !hasSource) {
        this.logger.info("Posters table description/source migration completed");
      }
    } catch (error) {
      this.logger.error("Migration error for posters table (description/source):", error);
    }

    // Check if lowerThirdAnimation column exists in themes table
    try {
      const themeTableInfo = this.db.prepare("PRAGMA table_info(themes)").all() as Array<{ name: string }>;
      const hasLowerThirdAnimation = themeTableInfo.some((col) => col.name === "lowerThirdAnimation");

      if (!hasLowerThirdAnimation) {
        this.logger.info("Adding lowerThirdAnimation column to themes table");
        this.db.exec(`
          ALTER TABLE themes ADD COLUMN lowerThirdAnimation TEXT DEFAULT '{"timing":{"logoFadeDuration":200,"logoScaleDuration":200,"flipDuration":600,"flipDelay":500,"barAppearDelay":800,"barExpandDuration":450,"textAppearDelay":1000,"textFadeDuration":250},"styles":{"barBorderRadius":16,"barMinWidth":200,"avatarBorderWidth":4,"avatarBorderColor":"#272727","freeTextMaxWidth":{"left":65,"right":65,"center":90}}}';
        `);
        this.logger.info("Themes table lowerThirdAnimation migration completed");
      } else {
        // Update existing records to include freeTextMaxWidth if missing
        this.logger.info("Checking for freeTextMaxWidth in existing themes...");
        const themes = this.db.prepare("SELECT id, lowerThirdAnimation FROM themes").all() as Array<{ id: string; lowerThirdAnimation: string }>;
        
        let updatedCount = 0;
        themes.forEach((theme) => {
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
        });
        
        if (updatedCount > 0) {
          this.logger.info(`Updated ${updatedCount} theme(s) with freeTextMaxWidth`);
        }
      }
    } catch (error) {
      this.logger.error("Migration error for themes table (lowerThirdAnimation):", error);
    }

    // Check if wikipedia_cache table exists
    try {
      const tables = this.db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='wikipedia_cache'").all() as Array<{ name: string }>;
      
      if (tables.length === 0) {
        this.logger.info("Creating wikipedia_cache table");
        this.db.exec(`
          CREATE TABLE wikipedia_cache (
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
          CREATE INDEX idx_wikipedia_cache_query ON wikipedia_cache(query, lang);
          CREATE INDEX idx_wikipedia_cache_created_at ON wikipedia_cache(created_at);
        `);
        this.logger.info("Wikipedia cache table created");
      } else {
        // Check if raw_extract column exists and add it if not
        const cacheTableInfo = this.db.prepare("PRAGMA table_info(wikipedia_cache)").all() as Array<{ name: string }>;
        const hasRawExtract = cacheTableInfo.some((col) => col.name === "raw_extract");
        
        if (!hasRawExtract) {
          this.logger.info("Adding raw_extract column to wikipedia_cache table");
          this.db.exec(`ALTER TABLE wikipedia_cache ADD COLUMN raw_extract TEXT`);
          this.logger.info("Wikipedia cache table raw_extract migration completed");
        }
      }
    } catch (error) {
      this.logger.error("Migration error for wikipedia_cache table:", error);
    }

    // Check if canSendCustomMessages column exists in rooms table
    try {
      const roomTableInfo = this.db.prepare("PRAGMA table_info(rooms)").all() as Array<{ name: string }>;
      const hasCanSendCustomMessages = roomTableInfo.some((col) => col.name === "canSendCustomMessages");

      if (!hasCanSendCustomMessages) {
        this.logger.info("Adding canSendCustomMessages column to rooms table");
        this.db.exec(`
          ALTER TABLE rooms ADD COLUMN canSendCustomMessages INTEGER NOT NULL DEFAULT 0;
        `);
        this.logger.info("Rooms table canSendCustomMessages migration completed");
      }
    } catch (error) {
      this.logger.error("Migration error for rooms table (canSendCustomMessages):", error);
    }

    // Check if streamerbotConnection column exists in rooms table
    try {
      const roomTableInfo = this.db.prepare("PRAGMA table_info(rooms)").all() as Array<{ name: string }>;
      const hasStreamerbotConnection = roomTableInfo.some((col) => col.name === "streamerbotConnection");

      if (!hasStreamerbotConnection) {
        this.logger.info("Adding streamerbotConnection column to rooms table");
        this.db.exec(`
          ALTER TABLE rooms ADD COLUMN streamerbotConnection TEXT;
        `);
        this.logger.info("Rooms table streamerbotConnection migration completed");
      }
    } catch (error) {
      this.logger.error("Migration error for rooms table (streamerbotConnection):", error);
    }

    // Check if allowPresenterToSendMessage column exists in rooms table
    try {
      const roomTableInfo = this.db.prepare("PRAGMA table_info(rooms)").all() as Array<{ name: string }>;
      const hasAllowPresenterToSendMessage = roomTableInfo.some((col) => col.name === "allowPresenterToSendMessage");

      if (!hasAllowPresenterToSendMessage) {
        this.logger.info("Adding allowPresenterToSendMessage column to rooms table");
        this.db.exec(`
          ALTER TABLE rooms ADD COLUMN allowPresenterToSendMessage INTEGER NOT NULL DEFAULT 0;
        `);
        this.logger.info("Rooms table allowPresenterToSendMessage migration completed");
      }
    } catch (error) {
      this.logger.error("Migration error for rooms table (allowPresenterToSendMessage):", error);
    }

    // Migrate panel_colors table to use scheme instead of individual color columns
    try {
      const panelColorTableInfo = this.db.prepare("PRAGMA table_info(panel_colors)").all() as Array<{ name: string }>;
      const hasScheme = panelColorTableInfo.some((col) => col.name === "scheme");

      if (!hasScheme) {
        this.logger.info("Adding scheme column to panel_colors table");
        this.db.exec(`
          ALTER TABLE panel_colors ADD COLUMN scheme TEXT NOT NULL DEFAULT 'neutral';
        `);
        this.logger.info("Panel colors table scheme migration completed");
      }
    } catch (error) {
      this.logger.error("Migration error for panel_colors table (scheme):", error);
    }

    // Add chatMessage column to guests and posters tables
    try {
      const guestTableInfo = this.db.prepare("PRAGMA table_info(guests)").all() as Array<{ name: string }>;
      const hasChatMessage = guestTableInfo.some((col) => col.name === "chatMessage");

      if (!hasChatMessage) {
        this.logger.info("Adding chatMessage column to guests table");
        this.db.exec(`ALTER TABLE guests ADD COLUMN chatMessage TEXT;`);
        this.logger.info("Guests table chatMessage migration completed");
      }
    } catch (error) {
      this.logger.error("Migration error for guests table (chatMessage):", error);
    }

    try {
      const posterTableInfo = this.db.prepare("PRAGMA table_info(posters)").all() as Array<{ name: string }>;
      const hasChatMessage = posterTableInfo.some((col) => col.name === "chatMessage");

      if (!hasChatMessage) {
        this.logger.info("Adding chatMessage column to posters table");
        this.db.exec(`ALTER TABLE posters ADD COLUMN chatMessage TEXT;`);
        this.logger.info("Posters table chatMessage migration completed");
      }
    } catch (error) {
      this.logger.error("Migration error for posters table (chatMessage):", error);
    }
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
        roomId TEXT NOT NULL,
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
        updatedAt INTEGER NOT NULL,
        FOREIGN KEY (roomId) REFERENCES rooms(id) ON DELETE CASCADE
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

      CREATE INDEX IF NOT EXISTS idx_guests_displayName ON guests(displayName);
      CREATE INDEX IF NOT EXISTS idx_posters_profileIds ON posters(profileIds);
      CREATE INDEX IF NOT EXISTS idx_profiles_isActive ON profiles(isActive);
      CREATE INDEX IF NOT EXISTS idx_presets_profileId ON presets(profileId);
      CREATE INDEX IF NOT EXISTS idx_macros_profileId ON macros(profileId);
      CREATE INDEX IF NOT EXISTS idx_plugins_updateStatus ON plugins(updateStatus);
      CREATE INDEX IF NOT EXISTS idx_wikipedia_cache_query ON wikipedia_cache(query, lang);
      CREATE INDEX IF NOT EXISTS idx_wikipedia_cache_created_at ON wikipedia_cache(created_at);
      CREATE INDEX IF NOT EXISTS idx_rooms_name ON rooms(name);
      CREATE INDEX IF NOT EXISTS idx_cue_messages_roomId ON cue_messages(roomId);
      CREATE INDEX IF NOT EXISTS idx_cue_messages_createdAt ON cue_messages(createdAt);
      CREATE INDEX IF NOT EXISTS idx_cue_messages_pinned ON cue_messages(pinned);
      CREATE INDEX IF NOT EXISTS idx_streamerbot_chat_timestamp ON streamerbot_chat_messages(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_panel_colors_panelId ON panel_colors(panelId);
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

  // ==================== GUESTS ====================

  /**
   * Get all guests
   */
  getAllGuests(): DbGuest[] {
    const stmt = this.db.prepare("SELECT * FROM guests ORDER BY displayName ASC");
    const rows = stmt.all() as Array<Omit<DbGuest, 'isEnabled' | 'createdAt' | 'updatedAt'> & { isEnabled: number; createdAt: string; updatedAt: string }>;
    return rows.map((row) => ({
      ...row,
      isEnabled: row.isEnabled === 1,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get guest by ID
   */
  getGuestById(id: string): DbGuest | null {
    const stmt = this.db.prepare("SELECT * FROM guests WHERE id = ?");
    const row = stmt.get(id) as (Omit<DbGuest, 'isEnabled' | 'createdAt' | 'updatedAt'> & { isEnabled: number; createdAt: string; updatedAt: string }) | undefined;
    if (!row) return null;
    return {
      ...row,
      isEnabled: row.isEnabled === 1,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Create a new guest
   */
  createGuest(guest: DbGuestInput): void {
    const now = new Date();
    console.log("[DB] Creating guest with data:", {
      id: guest.id,
      displayName: guest.displayName,
      subtitle: guest.subtitle,
      accentColor: guest.accentColor,
      avatarUrl: guest.avatarUrl,
      chatMessage: guest.chatMessage,
      isEnabled: guest.isEnabled,
    });

    const stmt = this.db.prepare(`
      INSERT INTO guests (id, displayName, subtitle, accentColor, avatarUrl, chatMessage, isEnabled, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      guest.id,
      guest.displayName,
      guest.subtitle || null,
      guest.accentColor,
      guest.avatarUrl || null,
      guest.chatMessage || null,
      guest.isEnabled ? 1 : 0,
      (guest.createdAt || now).toISOString(),
      (guest.updatedAt || now).toISOString()
    );

    console.log("[DB] Guest created successfully");
  }

  /**
   * Update a guest
   */
  updateGuest(id: string, updates: DbGuestUpdate): void {
    // Get existing guest to merge with updates
    const existing = this.getGuestById(id);
    if (!existing) {
      throw new Error(`Guest with id ${id} not found`);
    }

    // Merge existing data with updates
    const merged = {
      displayName: updates.displayName !== undefined ? updates.displayName : existing.displayName,
      subtitle: updates.subtitle !== undefined ? updates.subtitle : existing.subtitle,
      accentColor: updates.accentColor !== undefined ? updates.accentColor : existing.accentColor,
      avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : existing.avatarUrl,
      chatMessage: updates.chatMessage !== undefined ? updates.chatMessage : existing.chatMessage,
      isEnabled: updates.isEnabled !== undefined ? updates.isEnabled : existing.isEnabled,
      updatedAt: updates.updatedAt || new Date(),
    };

    console.log("[DB] Updating guest:", id, "with merged data:", merged);

    const stmt = this.db.prepare(`
      UPDATE guests
      SET displayName = ?, subtitle = ?, accentColor = ?, avatarUrl = ?, chatMessage = ?, isEnabled = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.displayName,
      merged.subtitle || null,
      merged.accentColor,
      merged.avatarUrl || null,
      merged.chatMessage || null,
      merged.isEnabled ? 1 : 0,
      merged.updatedAt.toISOString ? merged.updatedAt.toISOString() : merged.updatedAt,
      id
    );
  }

  /**
   * Delete a guest
   */
  deleteGuest(id: string): void {
    const stmt = this.db.prepare("DELETE FROM guests WHERE id = ?");
    stmt.run(id);
  }

  // ==================== POSTERS ====================

  /**
   * Get all posters
   */
  getAllPosters(): DbPoster[] {
    const stmt = this.db.prepare("SELECT * FROM posters ORDER BY createdAt DESC");
    const rows = stmt.all() as Array<Omit<DbPoster, 'tags' | 'profileIds' | 'metadata' | 'isEnabled' | 'createdAt' | 'updatedAt'> & { tags: string; profileIds: string; metadata: string | null; isEnabled: number; createdAt: string; updatedAt: string }>;
    return rows.map((row) => ({
      ...row,
      tags: safeJsonParse<string[]>(row.tags, []),
      profileIds: safeJsonParse<string[]>(row.profileIds, []),
      metadata: safeJsonParseOptional<Record<string, unknown>>(row.metadata),
      isEnabled: row.isEnabled === 1,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get poster by ID
   */
  getPosterById(id: string): DbPoster | null {
    const stmt = this.db.prepare("SELECT * FROM posters WHERE id = ?");
    const row = stmt.get(id) as (Omit<DbPoster, 'tags' | 'profileIds' | 'metadata' | 'isEnabled' | 'createdAt' | 'updatedAt'> & { tags: string; profileIds: string; metadata: string | null; isEnabled: number; createdAt: string; updatedAt: string }) | undefined;
    if (!row) return null;
    return {
      ...row,
      tags: safeJsonParse<string[]>(row.tags, []),
      profileIds: safeJsonParse<string[]>(row.profileIds, []),
      metadata: safeJsonParseOptional<Record<string, unknown>>(row.metadata),
      isEnabled: row.isEnabled === 1,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Create a new poster
   */
  createPoster(poster: DbPosterInput): void {
    const now = new Date();
    const stmt = this.db.prepare(`
      INSERT INTO posters (id, title, description, source, fileUrl, type, duration, tags, profileIds, metadata, chatMessage, isEnabled, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      poster.id,
      poster.title,
      poster.description || null,
      poster.source || null,
      poster.fileUrl,
      poster.type,
      poster.duration || null,
      JSON.stringify(poster.tags || []),
      JSON.stringify(poster.profileIds || []),
      poster.metadata ? JSON.stringify(poster.metadata) : null,
      poster.chatMessage || null,
      poster.isEnabled ? 1 : 0,
      (poster.createdAt || now).toISOString(),
      (poster.updatedAt || now).toISOString()
    );
  }

  /**
   * Update a poster
   */
  updatePoster(id: string, updates: DbPosterUpdate): void {
    // Get existing poster to merge with updates
    const existing = this.getPosterById(id);
    if (!existing) {
      throw new Error(`Poster with id ${id} not found`);
    }

    // Merge existing data with updates
    const merged = {
      title: updates.title !== undefined ? updates.title : existing.title,
      description: updates.description !== undefined ? updates.description : existing.description,
      source: updates.source !== undefined ? updates.source : existing.source,
      fileUrl: updates.fileUrl !== undefined ? updates.fileUrl : existing.fileUrl,
      type: updates.type !== undefined ? updates.type : existing.type,
      duration: updates.duration !== undefined ? updates.duration : existing.duration,
      tags: updates.tags !== undefined ? updates.tags : existing.tags,
      profileIds: updates.profileIds !== undefined ? updates.profileIds : existing.profileIds,
      metadata: updates.metadata !== undefined ? updates.metadata : existing.metadata,
      chatMessage: updates.chatMessage !== undefined ? updates.chatMessage : existing.chatMessage,
      isEnabled: updates.isEnabled !== undefined ? updates.isEnabled : existing.isEnabled,
      updatedAt: updates.updatedAt || new Date(),
    };

    const stmt = this.db.prepare(`
      UPDATE posters
      SET title = ?, description = ?, source = ?, fileUrl = ?, type = ?, duration = ?, tags = ?, profileIds = ?, metadata = ?, chatMessage = ?, isEnabled = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.title,
      merged.description || null,
      merged.source || null,
      merged.fileUrl,
      merged.type,
      merged.duration || null,
      JSON.stringify(merged.tags || []),
      JSON.stringify(merged.profileIds || []),
      merged.metadata ? JSON.stringify(merged.metadata) : null,
      merged.chatMessage || null,
      merged.isEnabled ? 1 : 0,
      merged.updatedAt.toISOString ? merged.updatedAt.toISOString() : merged.updatedAt,
      id
    );
  }

  /**
   * Delete a poster
   */
  deletePoster(id: string): void {
    const stmt = this.db.prepare("DELETE FROM posters WHERE id = ?");
    stmt.run(id);
  }

  // ==================== PROFILES ====================

  /**
   * Get all profiles
   */
  getAllProfiles(): DbProfile[] {
    const stmt = this.db.prepare("SELECT * FROM profiles ORDER BY isActive DESC, name ASC");
    const rows = stmt.all() as Array<Omit<DbProfile, 'isActive' | 'posterRotation' | 'audioSettings' | 'createdAt' | 'updatedAt'> & { isActive: number; posterRotation: string; audioSettings: string; createdAt: string; updatedAt: string }>;
    return rows.map((row) => ({
      ...row,
      isActive: Boolean(row.isActive),
      posterRotation: safeJsonParse<DbProfile['posterRotation']>(row.posterRotation, []),
      audioSettings: safeJsonParse<DbProfile['audioSettings']>(row.audioSettings, {}),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get profile by ID
   */
  getProfileById(id: string): DbProfile | null {
    const stmt = this.db.prepare("SELECT * FROM profiles WHERE id = ?");
    const row = stmt.get(id) as (Omit<DbProfile, 'isActive' | 'posterRotation' | 'audioSettings' | 'createdAt' | 'updatedAt'> & { isActive: number; posterRotation: string; audioSettings: string; createdAt: string; updatedAt: string }) | undefined;
    if (!row) return null;
    return {
      ...row,
      isActive: Boolean(row.isActive),
      posterRotation: safeJsonParse<DbProfile['posterRotation']>(row.posterRotation, []),
      audioSettings: safeJsonParse<DbProfile['audioSettings']>(row.audioSettings, {}),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Get active profile
   */
  getActiveProfile(): DbProfile | null {
    const stmt = this.db.prepare("SELECT * FROM profiles WHERE isActive = 1 LIMIT 1");
    const row = stmt.get() as (Omit<DbProfile, 'isActive' | 'posterRotation' | 'audioSettings' | 'createdAt' | 'updatedAt'> & { isActive: number; posterRotation: string; audioSettings: string; createdAt: string; updatedAt: string }) | undefined;
    if (!row) return null;
    return {
      ...row,
      isActive: Boolean(row.isActive),
      posterRotation: safeJsonParse<DbProfile['posterRotation']>(row.posterRotation, []),
      audioSettings: safeJsonParse<DbProfile['audioSettings']>(row.audioSettings, {}),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Create a new profile
   */
  createProfile(profile: DbProfileInput): void {
    const now = new Date();
    const stmt = this.db.prepare(`
      INSERT INTO profiles (id, name, description, themeId, dskSourceName, defaultScene, posterRotation, audioSettings, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      profile.id,
      profile.name,
      profile.description || null,
      profile.themeId,
      profile.dskSourceName || "Habillage",
      profile.defaultScene || null,
      JSON.stringify(profile.posterRotation || []),
      JSON.stringify(profile.audioSettings || {}),
      profile.isActive ? 1 : 0,
      (profile.createdAt || now).toISOString(),
      (profile.updatedAt || now).toISOString()
    );
  }

  /**
   * Update a profile
   */
  updateProfile(id: string, updates: DbProfileUpdate): void {
    const stmt = this.db.prepare(`
      UPDATE profiles
      SET name = ?, description = ?, themeId = ?, dskSourceName = ?, defaultScene = ?, posterRotation = ?, audioSettings = ?, isActive = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      updates.name,
      updates.description || null,
      updates.themeId,
      updates.dskSourceName || "Habillage",
      updates.defaultScene || null,
      JSON.stringify(updates.posterRotation || []),
      JSON.stringify(updates.audioSettings || {}),
      updates.isActive ? 1 : 0,
      (updates.updatedAt || new Date()).toISOString(),
      id
    );
  }

  /**
   * Set active profile (deactivates all others)
   */
  setActiveProfile(id: string): void {
    // Deactivate all profiles
    this.db.prepare("UPDATE profiles SET isActive = 0").run();
    // Activate the specified profile
    this.db.prepare("UPDATE profiles SET isActive = 1, updatedAt = ? WHERE id = ?")
      .run(new Date().toISOString(), id);
  }

  /**
   * Delete a profile
   */
  deleteProfile(id: string): void {
    const stmt = this.db.prepare("DELETE FROM profiles WHERE id = ?");
    stmt.run(id);
  }

  // ==================== THEMES ====================

  /**
   * Get all themes
   */
  getAllThemes(): DbTheme[] {
    const stmt = this.db.prepare("SELECT * FROM themes ORDER BY isGlobal DESC, name ASC");
    const rows = stmt.all() as Array<Omit<DbTheme, 'colors' | 'lowerThirdFont' | 'lowerThirdLayout' | 'lowerThirdAnimation' | 'countdownFont' | 'countdownLayout' | 'posterLayout' | 'isGlobal' | 'createdAt' | 'updatedAt'> & { colors: string; lowerThirdFont: string; lowerThirdLayout: string; lowerThirdAnimation?: string; countdownFont: string; countdownLayout: string; posterLayout: string; isGlobal: number; createdAt: string; updatedAt: string }>;
    const defaultColors: DbTheme['colors'] = { primary: '#000000', accent: '#ffffff', surface: '#333333', text: '#ffffff', success: '#00ff00', warn: '#ff0000' };
    const defaultFont: DbTheme['lowerThirdFont'] = { family: 'Arial', size: 16, weight: 400 };
    const defaultLayout: DbTheme['lowerThirdLayout'] = { x: 60, y: 920, scale: 1 };
    const defaultAnimation: DbTheme['lowerThirdAnimation'] = {
      timing: {
        logoFadeDuration: 200,
        logoScaleDuration: 200,
        flipDuration: 600,
        flipDelay: 500,
        barAppearDelay: 800,
        barExpandDuration: 450,
        textAppearDelay: 1000,
        textFadeDuration: 250,
      },
      styles: {
        barBorderRadius: 16,
        barMinWidth: 200,
        avatarBorderWidth: 4,
        avatarBorderColor: '#272727',
      },
    };
    return rows.map((row) => ({
      ...row,
      colors: safeJsonParse<DbTheme['colors']>(row.colors, defaultColors),
      lowerThirdFont: safeJsonParse<DbTheme['lowerThirdFont']>(row.lowerThirdFont, defaultFont),
      lowerThirdLayout: safeJsonParse<DbTheme['lowerThirdLayout']>(row.lowerThirdLayout, defaultLayout),
      lowerThirdAnimation: safeJsonParse<DbTheme['lowerThirdAnimation']>(row.lowerThirdAnimation, defaultAnimation),
      countdownFont: safeJsonParse<DbTheme['countdownFont']>(row.countdownFont, defaultFont),
      countdownLayout: safeJsonParse<DbTheme['countdownLayout']>(row.countdownLayout, { x: 960, y: 540, scale: 1 }),
      posterLayout: safeJsonParse<DbTheme['posterLayout']>(row.posterLayout, { x: 960, y: 540, scale: 1 }),
      isGlobal: Boolean(row.isGlobal),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get theme by ID
   */
  getThemeById(id: string): DbTheme | null {
    const stmt = this.db.prepare("SELECT * FROM themes WHERE id = ?");
    const row = stmt.get(id) as (Omit<DbTheme, 'colors' | 'lowerThirdFont' | 'lowerThirdLayout' | 'lowerThirdAnimation' | 'countdownFont' | 'countdownLayout' | 'posterLayout' | 'isGlobal' | 'createdAt' | 'updatedAt'> & { colors: string; lowerThirdFont: string; lowerThirdLayout: string; lowerThirdAnimation?: string; countdownFont: string; countdownLayout: string; posterLayout: string; isGlobal: number; createdAt: string; updatedAt: string }) | undefined;
    if (!row) return null;
    const defaultColors: DbTheme['colors'] = { primary: '#000000', accent: '#ffffff', surface: '#333333', text: '#ffffff', success: '#00ff00', warn: '#ff0000' };
    const defaultFont: DbTheme['lowerThirdFont'] = { family: 'Arial', size: 16, weight: 400 };
    const defaultLayout: DbTheme['lowerThirdLayout'] = { x: 60, y: 920, scale: 1 };
    const defaultAnimation: DbTheme['lowerThirdAnimation'] = {
      timing: {
        logoFadeDuration: 200,
        logoScaleDuration: 200,
        flipDuration: 600,
        flipDelay: 500,
        barAppearDelay: 800,
        barExpandDuration: 450,
        textAppearDelay: 1000,
        textFadeDuration: 250,
      },
      styles: {
        barBorderRadius: 16,
        barMinWidth: 200,
        avatarBorderWidth: 4,
        avatarBorderColor: '#272727',
      },
    };
    return {
      ...row,
      colors: safeJsonParse<DbTheme['colors']>(row.colors, defaultColors),
      lowerThirdFont: safeJsonParse<DbTheme['lowerThirdFont']>(row.lowerThirdFont, defaultFont),
      lowerThirdLayout: safeJsonParse<DbTheme['lowerThirdLayout']>(row.lowerThirdLayout, defaultLayout),
      lowerThirdAnimation: safeJsonParse<DbTheme['lowerThirdAnimation']>(row.lowerThirdAnimation, defaultAnimation),
      countdownFont: safeJsonParse<DbTheme['countdownFont']>(row.countdownFont, defaultFont),
      countdownLayout: safeJsonParse<DbTheme['countdownLayout']>(row.countdownLayout, { x: 960, y: 540, scale: 1 }),
      posterLayout: safeJsonParse<DbTheme['posterLayout']>(row.posterLayout, { x: 960, y: 540, scale: 1 }),
      isGlobal: Boolean(row.isGlobal),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Create a new theme
   */
  createTheme(theme: DbThemeInput): void {
    const now = new Date();
    const stmt = this.db.prepare(`
      INSERT INTO themes (id, name, colors, lowerThirdTemplate, lowerThirdFont, lowerThirdLayout, lowerThirdAnimation, countdownStyle, countdownFont, countdownLayout, posterLayout, isGlobal, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      theme.id,
      theme.name,
      JSON.stringify(theme.colors),
      theme.lowerThirdTemplate,
      JSON.stringify(theme.lowerThirdFont),
      JSON.stringify(theme.lowerThirdLayout || { x: 60, y: 920, scale: 1 }),
      JSON.stringify(theme.lowerThirdAnimation || {
        timing: {
          logoFadeDuration: 200,
          logoScaleDuration: 200,
          flipDuration: 600,
          flipDelay: 500,
          barAppearDelay: 800,
          barExpandDuration: 450,
          textAppearDelay: 1000,
          textFadeDuration: 250,
        },
        styles: {
          barBorderRadius: 16,
          barMinWidth: 200,
          avatarBorderWidth: 4,
          avatarBorderColor: '#272727',
        },
      }),
      theme.countdownStyle,
      JSON.stringify(theme.countdownFont),
      JSON.stringify(theme.countdownLayout || { x: 960, y: 540, scale: 1 }),
      JSON.stringify(theme.posterLayout || { x: 960, y: 540, scale: 1 }),
      theme.isGlobal ? 1 : 0,
      (theme.createdAt || now).toISOString(),
      (theme.updatedAt || now).toISOString()
    );
  }

  /**
   * Update a theme
   */
  updateTheme(id: string, updates: DbThemeUpdate): void {
    const stmt = this.db.prepare(`
      UPDATE themes
      SET name = ?, colors = ?, lowerThirdTemplate = ?, lowerThirdFont = ?, lowerThirdLayout = ?, lowerThirdAnimation = ?, countdownStyle = ?, countdownFont = ?, countdownLayout = ?, posterLayout = ?, isGlobal = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      updates.name,
      JSON.stringify(updates.colors),
      updates.lowerThirdTemplate,
      JSON.stringify(updates.lowerThirdFont),
      JSON.stringify(updates.lowerThirdLayout || { x: 60, y: 920, scale: 1 }),
      JSON.stringify(updates.lowerThirdAnimation || {
        timing: {
          logoFadeDuration: 200,
          logoScaleDuration: 200,
          flipDuration: 600,
          flipDelay: 500,
          barAppearDelay: 800,
          barExpandDuration: 450,
          textAppearDelay: 1000,
          textFadeDuration: 250,
        },
        styles: {
          barBorderRadius: 16,
          barMinWidth: 200,
          avatarBorderWidth: 4,
          avatarBorderColor: '#272727',
        },
      }),
      updates.countdownStyle,
      JSON.stringify(updates.countdownFont),
      JSON.stringify(updates.countdownLayout || { x: 960, y: 540, scale: 1 }),
      JSON.stringify(updates.posterLayout || { x: 960, y: 540, scale: 1 }),
      updates.isGlobal ? 1 : 0,
      (updates.updatedAt || new Date()).toISOString(),
      id
    );
  }

  /**
   * Delete a theme
   */
  deleteTheme(id: string): void {
    const stmt = this.db.prepare("DELETE FROM themes WHERE id = ?");
    stmt.run(id);
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

  // ==================== ROOMS ====================

  /**
   * Get all rooms
   */
  getAllRooms(): DbRoom[] {
    const stmt = this.db.prepare("SELECT * FROM rooms ORDER BY name ASC");
    const rows = stmt.all() as Array<Omit<DbRoom, 'quickReplies' | 'canSendCustomMessages' | 'streamerbotConnection' | 'allowPresenterToSendMessage' | 'createdAt' | 'updatedAt'> & { quickReplies: string; canSendCustomMessages: number; streamerbotConnection: string | null; allowPresenterToSendMessage: number; createdAt: string; updatedAt: string }>;
    return rows.map((row) => ({
      ...row,
      quickReplies: safeJsonParse<DbRoom['quickReplies']>(row.quickReplies, []),
      canSendCustomMessages: Boolean(row.canSendCustomMessages),
      streamerbotConnection: safeJsonParseOptional<DbRoom['streamerbotConnection']>(row.streamerbotConnection) ?? null,
      allowPresenterToSendMessage: Boolean(row.allowPresenterToSendMessage),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get room by ID
   */
  getRoomById(id: string): DbRoom | null {
    const stmt = this.db.prepare("SELECT * FROM rooms WHERE id = ?");
    const row = stmt.get(id) as (Omit<DbRoom, 'quickReplies' | 'canSendCustomMessages' | 'streamerbotConnection' | 'allowPresenterToSendMessage' | 'createdAt' | 'updatedAt'> & { quickReplies: string; canSendCustomMessages: number; streamerbotConnection: string | null; allowPresenterToSendMessage: number; createdAt: string; updatedAt: string }) | undefined;
    if (!row) return null;
    return {
      ...row,
      quickReplies: safeJsonParse<DbRoom['quickReplies']>(row.quickReplies, []),
      canSendCustomMessages: Boolean(row.canSendCustomMessages),
      streamerbotConnection: safeJsonParseOptional<DbRoom['streamerbotConnection']>(row.streamerbotConnection) ?? null,
      allowPresenterToSendMessage: Boolean(row.allowPresenterToSendMessage),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Create a new room
   */
  createRoom(room: DbRoomInput): void {
    const now = new Date();
    const stmt = this.db.prepare(`
      INSERT INTO rooms (id, name, vdoNinjaUrl, twitchChatUrl, quickReplies, canSendCustomMessages, streamerbotConnection, allowPresenterToSendMessage, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      room.id,
      room.name,
      room.vdoNinjaUrl || null,
      room.twitchChatUrl || null,
      JSON.stringify(room.quickReplies || []),
      room.canSendCustomMessages ? 1 : 0,
      room.streamerbotConnection || null,
      room.allowPresenterToSendMessage ? 1 : 0,
      (room.createdAt || now).toISOString(),
      (room.updatedAt || now).toISOString()
    );
  }

  /**
   * Update a room
   */
  updateRoom(id: string, updates: DbRoomUpdate): void {
    const existing = this.getRoomById(id);
    if (!existing) {
      throw new Error(`Room with id ${id} not found`);
    }

    const merged = {
      name: updates.name !== undefined ? updates.name : existing.name,
      vdoNinjaUrl: updates.vdoNinjaUrl !== undefined ? updates.vdoNinjaUrl : existing.vdoNinjaUrl,
      twitchChatUrl: updates.twitchChatUrl !== undefined ? updates.twitchChatUrl : existing.twitchChatUrl,
      quickReplies: updates.quickReplies !== undefined ? updates.quickReplies : existing.quickReplies,
      canSendCustomMessages: updates.canSendCustomMessages !== undefined ? updates.canSendCustomMessages : existing.canSendCustomMessages,
      streamerbotConnection: updates.streamerbotConnection !== undefined ? updates.streamerbotConnection : existing.streamerbotConnection,
      allowPresenterToSendMessage: updates.allowPresenterToSendMessage !== undefined ? updates.allowPresenterToSendMessage : existing.allowPresenterToSendMessage,
      updatedAt: updates.updatedAt || new Date(),
    };

    const stmt = this.db.prepare(`
      UPDATE rooms
      SET name = ?, vdoNinjaUrl = ?, twitchChatUrl = ?, quickReplies = ?, canSendCustomMessages = ?, streamerbotConnection = ?, allowPresenterToSendMessage = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.name,
      merged.vdoNinjaUrl || null,
      merged.twitchChatUrl || null,
      JSON.stringify(merged.quickReplies || []),
      merged.canSendCustomMessages ? 1 : 0,
      merged.streamerbotConnection || null,
      merged.allowPresenterToSendMessage ? 1 : 0,
      merged.updatedAt.toISOString ? merged.updatedAt.toISOString() : merged.updatedAt,
      id
    );
  }

  /**
   * Delete a room
   */
  deleteRoom(id: string): void {
    const stmt = this.db.prepare("DELETE FROM rooms WHERE id = ?");
    stmt.run(id);
  }

  // ==================== CUE MESSAGES ====================

  /**
   * Get messages by room ID with optional limit and cursor
   */
  getMessagesByRoom(roomId: string, limit: number = 50, cursor?: number): DbCueMessage[] {
    let query = "SELECT * FROM cue_messages WHERE roomId = ?";
    const params: (string | number)[] = [roomId];

    if (cursor) {
      query += " AND createdAt < ?";
      params.push(cursor);
    }

    query += " ORDER BY createdAt DESC LIMIT ?";
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as Array<Omit<DbCueMessage, 'pinned' | 'actions' | 'countdownPayload' | 'contextPayload' | 'questionPayload' | 'seenBy' | 'ackedBy'> & { pinned: number; actions: string; countdownPayload: string | null; contextPayload: string | null; questionPayload: string | null; seenBy: string; ackedBy: string }>;

    return rows.map((row) => ({
      ...row,
      pinned: row.pinned === 1,
      actions: safeJsonParse<string[]>(row.actions, []),
      countdownPayload: safeJsonParseOptional<Record<string, unknown>>(row.countdownPayload) ?? null,
      contextPayload: safeJsonParseOptional<Record<string, unknown>>(row.contextPayload) ?? null,
      questionPayload: safeJsonParseOptional<Record<string, unknown>>(row.questionPayload) ?? null,
      seenBy: safeJsonParse<string[]>(row.seenBy, []),
      ackedBy: safeJsonParse<string[]>(row.ackedBy, []),
    }));
  }

  /**
   * Get pinned messages by room ID
   */
  getPinnedMessages(roomId: string): DbCueMessage[] {
    const stmt = this.db.prepare("SELECT * FROM cue_messages WHERE roomId = ? AND pinned = 1 ORDER BY createdAt DESC");
    const rows = stmt.all(roomId) as Array<Omit<DbCueMessage, 'pinned' | 'actions' | 'countdownPayload' | 'contextPayload' | 'questionPayload' | 'seenBy' | 'ackedBy'> & { pinned: number; actions: string; countdownPayload: string | null; contextPayload: string | null; questionPayload: string | null; seenBy: string; ackedBy: string }>;

    return rows.map((row) => ({
      ...row,
      pinned: row.pinned === 1,
      actions: safeJsonParse<string[]>(row.actions, []),
      countdownPayload: safeJsonParseOptional<Record<string, unknown>>(row.countdownPayload) ?? null,
      contextPayload: safeJsonParseOptional<Record<string, unknown>>(row.contextPayload) ?? null,
      questionPayload: safeJsonParseOptional<Record<string, unknown>>(row.questionPayload) ?? null,
      seenBy: safeJsonParse<string[]>(row.seenBy, []),
      ackedBy: safeJsonParse<string[]>(row.ackedBy, []),
    }));
  }

  /**
   * Get message by ID
   */
  getMessageById(id: string): DbCueMessage | null {
    const stmt = this.db.prepare("SELECT * FROM cue_messages WHERE id = ?");
    const row = stmt.get(id) as (Omit<DbCueMessage, 'pinned' | 'actions' | 'countdownPayload' | 'contextPayload' | 'questionPayload' | 'seenBy' | 'ackedBy'> & { pinned: number; actions: string; countdownPayload: string | null; contextPayload: string | null; questionPayload: string | null; seenBy: string; ackedBy: string }) | undefined;

    if (!row) return null;

    return {
      ...row,
      pinned: row.pinned === 1,
      actions: safeJsonParse<string[]>(row.actions, []),
      countdownPayload: safeJsonParseOptional<Record<string, unknown>>(row.countdownPayload) ?? null,
      contextPayload: safeJsonParseOptional<Record<string, unknown>>(row.contextPayload) ?? null,
      questionPayload: safeJsonParseOptional<Record<string, unknown>>(row.questionPayload) ?? null,
      seenBy: safeJsonParse<string[]>(row.seenBy, []),
      ackedBy: safeJsonParse<string[]>(row.ackedBy, []),
    };
  }

  /**
   * Create a new cue message
   */
  createMessage(message: DbCueMessageInput): DbCueMessage {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO cue_messages (id, roomId, type, fromRole, severity, title, body, pinned, actions, countdownPayload, contextPayload, questionPayload, seenBy, ackedBy, resolvedAt, resolvedBy, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      message.id,
      message.roomId,
      message.type,
      message.fromRole,
      message.severity || null,
      message.title || null,
      message.body || null,
      message.pinned ? 1 : 0,
      JSON.stringify(message.actions || []),
      message.countdownPayload ? JSON.stringify(message.countdownPayload) : null,
      message.contextPayload ? JSON.stringify(message.contextPayload) : null,
      message.questionPayload ? JSON.stringify(message.questionPayload) : null,
      JSON.stringify(message.seenBy || []),
      JSON.stringify(message.ackedBy || []),
      message.resolvedAt || null,
      message.resolvedBy || null,
      message.createdAt || now,
      message.updatedAt || now
    );

    return this.getMessageById(message.id)!;
  }

  /**
   * Update a cue message
   */
  updateMessage(id: string, updates: DbCueMessageUpdate): void {
    const existing = this.getMessageById(id);
    if (!existing) {
      throw new Error(`Message with id ${id} not found`);
    }

    const merged = {
      type: updates.type !== undefined ? updates.type : existing.type,
      fromRole: updates.fromRole !== undefined ? updates.fromRole : existing.fromRole,
      severity: updates.severity !== undefined ? updates.severity : existing.severity,
      title: updates.title !== undefined ? updates.title : existing.title,
      body: updates.body !== undefined ? updates.body : existing.body,
      pinned: updates.pinned !== undefined ? updates.pinned : existing.pinned,
      actions: updates.actions !== undefined ? updates.actions : existing.actions,
      countdownPayload: updates.countdownPayload !== undefined ? updates.countdownPayload : existing.countdownPayload,
      contextPayload: updates.contextPayload !== undefined ? updates.contextPayload : existing.contextPayload,
      questionPayload: updates.questionPayload !== undefined ? updates.questionPayload : existing.questionPayload,
      seenBy: updates.seenBy !== undefined ? updates.seenBy : existing.seenBy,
      ackedBy: updates.ackedBy !== undefined ? updates.ackedBy : existing.ackedBy,
      resolvedAt: updates.resolvedAt !== undefined ? updates.resolvedAt : existing.resolvedAt,
      resolvedBy: updates.resolvedBy !== undefined ? updates.resolvedBy : existing.resolvedBy,
      updatedAt: updates.updatedAt || Date.now(),
    };

    const stmt = this.db.prepare(`
      UPDATE cue_messages
      SET type = ?, fromRole = ?, severity = ?, title = ?, body = ?, pinned = ?, actions = ?, countdownPayload = ?, contextPayload = ?, questionPayload = ?, seenBy = ?, ackedBy = ?, resolvedAt = ?, resolvedBy = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.type,
      merged.fromRole,
      merged.severity || null,
      merged.title || null,
      merged.body || null,
      merged.pinned ? 1 : 0,
      JSON.stringify(merged.actions || []),
      merged.countdownPayload ? JSON.stringify(merged.countdownPayload) : null,
      merged.contextPayload ? JSON.stringify(merged.contextPayload) : null,
      merged.questionPayload ? JSON.stringify(merged.questionPayload) : null,
      JSON.stringify(merged.seenBy || []),
      JSON.stringify(merged.ackedBy || []),
      merged.resolvedAt || null,
      merged.resolvedBy || null,
      merged.updatedAt,
      id
    );
  }

  /**
   * Delete a cue message
   */
  deleteMessage(id: string): void {
    const stmt = this.db.prepare("DELETE FROM cue_messages WHERE id = ?");
    stmt.run(id);
  }

  /**
   * Delete old messages from a room, keeping only the most recent N
   */
  deleteOldMessages(roomId: string, keepCount: number = 100): void {
    // Get the cutoff timestamp
    const stmt = this.db.prepare(`
      SELECT createdAt FROM cue_messages
      WHERE roomId = ? AND pinned = 0
      ORDER BY createdAt DESC
      LIMIT 1 OFFSET ?
    `);
    const row = stmt.get(roomId, keepCount - 1) as { createdAt: number } | undefined;

    if (row) {
      const deleteStmt = this.db.prepare(`
        DELETE FROM cue_messages
        WHERE roomId = ? AND pinned = 0 AND createdAt < ?
      `);
      deleteStmt.run(roomId, row.createdAt);
    }
  }

  /**
   * Clear all messages from a room (including pinned)
   */
  clearRoomMessages(roomId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM cue_messages
      WHERE roomId = ?
    `);
    stmt.run(roomId);
  }

  // ==================== STREAMERBOT CHAT MESSAGES ====================

  private readonly CHAT_BUFFER_SIZE = 200;

  /**
   * Get recent chat messages, ordered by timestamp descending
   */
  getStreamerbotChatMessages(limit: number = 200): DbStreamerbotChatMessage[] {
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
   * Insert a chat message and maintain rolling buffer of 200 messages
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
   * Trim chat buffer to maintain max 200 messages
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


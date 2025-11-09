import Database from "better-sqlite3";
import { PathManager } from "../config/PathManager";
import { Logger } from "../utils/Logger";
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
} from "../models/Database";
import {
  MediaItem,
  MediaPlaylist,
  MediaInstance,
  CreateMediaItemInput,
  UpdateMediaItemInput,
} from "../models/Media";

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

      CREATE TABLE IF NOT EXISTS media_playlists (
        id TEXT PRIMARY KEY,
        instance TEXT NOT NULL UNIQUE,
        on INTEGER NOT NULL DEFAULT 0,
        muted INTEGER NOT NULL DEFAULT 1,
        currentIndex INTEGER NOT NULL DEFAULT 0,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS media_items (
        id TEXT PRIMARY KEY,
        playlistId TEXT NOT NULL,
        url TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT,
        thumb TEXT,
        start TEXT,
        end TEXT,
        zoom REAL,
        panX REAL,
        panY REAL,
        position INTEGER NOT NULL,
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        FOREIGN KEY (playlistId) REFERENCES media_playlists(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_guests_displayName ON guests(displayName);
      CREATE INDEX IF NOT EXISTS idx_posters_profileIds ON posters(profileIds);
      CREATE INDEX IF NOT EXISTS idx_profiles_isActive ON profiles(isActive);
      CREATE INDEX IF NOT EXISTS idx_presets_profileId ON presets(profileId);
      CREATE INDEX IF NOT EXISTS idx_macros_profileId ON macros(profileId);
      CREATE INDEX IF NOT EXISTS idx_plugins_updateStatus ON plugins(updateStatus);
      CREATE INDEX IF NOT EXISTS idx_media_items_playlistId ON media_items(playlistId);
      CREATE INDEX IF NOT EXISTS idx_media_items_position ON media_items(position);
    `);

    this.logger.info("Database tables initialized");

    // Run migrations after tables are created
    this.runMigrations();

    // Initialize media playlists
    this.initializeMediaPlaylists();
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
      isEnabled: guest.isEnabled,
    });

    const stmt = this.db.prepare(`
      INSERT INTO guests (id, displayName, subtitle, accentColor, avatarUrl, isEnabled, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      guest.id,
      guest.displayName,
      guest.subtitle || null,
      guest.accentColor,
      guest.avatarUrl || null,
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
      isEnabled: updates.isEnabled !== undefined ? updates.isEnabled : existing.isEnabled,
      updatedAt: updates.updatedAt || new Date(),
    };

    console.log("[DB] Updating guest:", id, "with merged data:", merged);

    const stmt = this.db.prepare(`
      UPDATE guests
      SET displayName = ?, subtitle = ?, accentColor = ?, avatarUrl = ?, isEnabled = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.displayName,
      merged.subtitle || null,
      merged.accentColor,
      merged.avatarUrl || null,
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
      tags: JSON.parse(row.tags || "[]"),
      profileIds: JSON.parse(row.profileIds || "[]"),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
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
      tags: JSON.parse(row.tags || "[]"),
      profileIds: JSON.parse(row.profileIds || "[]"),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
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
      INSERT INTO posters (id, title, fileUrl, type, duration, tags, profileIds, metadata, isEnabled, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      poster.id,
      poster.title,
      poster.fileUrl,
      poster.type,
      poster.duration || null,
      JSON.stringify(poster.tags || []),
      JSON.stringify(poster.profileIds || []),
      poster.metadata ? JSON.stringify(poster.metadata) : null,
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
      fileUrl: updates.fileUrl !== undefined ? updates.fileUrl : existing.fileUrl,
      type: updates.type !== undefined ? updates.type : existing.type,
      duration: updates.duration !== undefined ? updates.duration : existing.duration,
      tags: updates.tags !== undefined ? updates.tags : existing.tags,
      profileIds: updates.profileIds !== undefined ? updates.profileIds : existing.profileIds,
      metadata: updates.metadata !== undefined ? updates.metadata : existing.metadata,
      isEnabled: updates.isEnabled !== undefined ? updates.isEnabled : existing.isEnabled,
      updatedAt: updates.updatedAt || new Date(),
    };

    const stmt = this.db.prepare(`
      UPDATE posters
      SET title = ?, fileUrl = ?, type = ?, duration = ?, tags = ?, profileIds = ?, metadata = ?, isEnabled = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.title,
      merged.fileUrl,
      merged.type,
      merged.duration || null,
      JSON.stringify(merged.tags || []),
      JSON.stringify(merged.profileIds || []),
      merged.metadata ? JSON.stringify(merged.metadata) : null,
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
      posterRotation: JSON.parse(row.posterRotation || "[]"),
      audioSettings: JSON.parse(row.audioSettings || "{}"),
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
      posterRotation: JSON.parse(row.posterRotation || "[]"),
      audioSettings: JSON.parse(row.audioSettings || "{}"),
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
      posterRotation: JSON.parse(row.posterRotation || "[]"),
      audioSettings: JSON.parse(row.audioSettings || "{}"),
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
      updates.updatedAt.toISOString(),
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
    const rows = stmt.all() as Array<Omit<DbTheme, 'colors' | 'lowerThirdFont' | 'lowerThirdLayout' | 'countdownFont' | 'countdownLayout' | 'posterLayout' | 'isGlobal' | 'createdAt' | 'updatedAt'> & { colors: string; lowerThirdFont: string; lowerThirdLayout: string; countdownFont: string; countdownLayout: string; posterLayout: string; isGlobal: number; createdAt: string; updatedAt: string }>;
    return rows.map((row) => ({
      ...row,
      colors: JSON.parse(row.colors),
      lowerThirdFont: JSON.parse(row.lowerThirdFont),
      lowerThirdLayout: JSON.parse(row.lowerThirdLayout || '{"x":60,"y":920,"scale":1}'),
      countdownFont: JSON.parse(row.countdownFont),
      countdownLayout: JSON.parse(row.countdownLayout || '{"x":960,"y":540,"scale":1}'),
      posterLayout: JSON.parse(row.posterLayout || '{"x":960,"y":540,"scale":1}'),
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
    const row = stmt.get(id) as (Omit<DbTheme, 'colors' | 'lowerThirdFont' | 'lowerThirdLayout' | 'countdownFont' | 'countdownLayout' | 'posterLayout' | 'isGlobal' | 'createdAt' | 'updatedAt'> & { colors: string; lowerThirdFont: string; lowerThirdLayout: string; countdownFont: string; countdownLayout: string; posterLayout: string; isGlobal: number; createdAt: string; updatedAt: string }) | undefined;
    if (!row) return null;
    return {
      ...row,
      colors: JSON.parse(row.colors),
      lowerThirdFont: JSON.parse(row.lowerThirdFont),
      lowerThirdLayout: JSON.parse(row.lowerThirdLayout || '{"x":60,"y":920,"scale":1}'),
      countdownFont: JSON.parse(row.countdownFont),
      countdownLayout: JSON.parse(row.countdownLayout || '{"x":960,"y":540,"scale":1}'),
      posterLayout: JSON.parse(row.posterLayout || '{"x":960,"y":540,"scale":1}'),
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
      INSERT INTO themes (id, name, colors, lowerThirdTemplate, lowerThirdFont, lowerThirdLayout, countdownStyle, countdownFont, countdownLayout, posterLayout, isGlobal, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      theme.id,
      theme.name,
      JSON.stringify(theme.colors),
      theme.lowerThirdTemplate,
      JSON.stringify(theme.lowerThirdFont),
      JSON.stringify(theme.lowerThirdLayout || { x: 60, y: 920, scale: 1 }),
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
      SET name = ?, colors = ?, lowerThirdTemplate = ?, lowerThirdFont = ?, lowerThirdLayout = ?, countdownStyle = ?, countdownFont = ?, countdownLayout = ?, posterLayout = ?, isGlobal = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      updates.name,
      JSON.stringify(updates.colors),
      updates.lowerThirdTemplate,
      JSON.stringify(updates.lowerThirdFont),
      JSON.stringify(updates.lowerThirdLayout || { x: 60, y: 920, scale: 1 }),
      updates.countdownStyle,
      JSON.stringify(updates.countdownFont),
      JSON.stringify(updates.countdownLayout || { x: 960, y: 540, scale: 1 }),
      JSON.stringify(updates.posterLayout || { x: 960, y: 540, scale: 1 }),
      updates.isGlobal ? 1 : 0,
      updates.updatedAt.toISOString(),
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

  // ==================== MEDIA PLAYLISTS ====================

  /**
   * Initialize media playlists for instances A and B
   */
  initializeMediaPlaylists(): void {
    const { randomUUID } = require('crypto');
    const now = new Date().toISOString();

    // Check if playlists exist
    const existingA = this.getMediaPlaylistByInstance(MediaInstance.A);
    const existingB = this.getMediaPlaylistByInstance(MediaInstance.B);

    // Create playlist A if not exists (enabled by default)
    if (!existingA) {
      const stmt = this.db.prepare(`
        INSERT INTO media_playlists (id, instance, on, muted, currentIndex, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(randomUUID(), MediaInstance.A, 1, 1, 0, now, now);
      this.logger.info("Created media playlist A");
    }

    // Create playlist B if not exists (disabled by default)
    if (!existingB) {
      const stmt = this.db.prepare(`
        INSERT INTO media_playlists (id, instance, on, muted, currentIndex, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(randomUUID(), MediaInstance.B, 0, 1, 0, now, now);
      this.logger.info("Created media playlist B");
    }
  }

  /**
   * Get media playlist by instance (A or B)
   */
  getMediaPlaylistByInstance(instance: MediaInstance): MediaPlaylist | null {
    const stmt = this.db.prepare("SELECT * FROM media_playlists WHERE instance = ?");
    const row = stmt.get(instance) as any;
    if (!row) return null;

    // Get items for this playlist
    const items = this.getMediaItemsByPlaylistId(row.id);

    return {
      id: row.id,
      instance: row.instance as MediaInstance,
      on: row.on === 1,
      muted: row.muted === 1,
      items,
      index: row.currentIndex,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Update media playlist
   */
  updateMediaPlaylist(
    instance: MediaInstance,
    updates: { on?: boolean; muted?: boolean; index?: number }
  ): void {
    const playlist = this.getMediaPlaylistByInstance(instance);
    if (!playlist) {
      throw new Error(`Media playlist ${instance} not found`);
    }

    const merged = {
      on: updates.on !== undefined ? updates.on : playlist.on,
      muted: updates.muted !== undefined ? updates.muted : playlist.muted,
      currentIndex: updates.index !== undefined ? updates.index : playlist.index,
      updatedAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      UPDATE media_playlists
      SET on = ?, muted = ?, currentIndex = ?, updatedAt = ?
      WHERE instance = ?
    `);
    stmt.run(merged.on ? 1 : 0, merged.muted ? 1 : 0, merged.currentIndex, merged.updatedAt, instance);
  }

  // ==================== MEDIA ITEMS ====================

  /**
   * Get all media items for a playlist
   */
  getMediaItemsByPlaylistId(playlistId: string): MediaItem[] {
    const stmt = this.db.prepare(
      "SELECT * FROM media_items WHERE playlistId = ? ORDER BY position ASC"
    );
    const rows = stmt.all(playlistId) as any[];
    return rows.map((row) => ({
      id: row.id,
      url: row.url,
      type: row.type,
      title: row.title || undefined,
      thumb: row.thumb || undefined,
      start: row.start || undefined,
      end: row.end || undefined,
      zoom: row.zoom || undefined,
      pan: row.panX !== null && row.panY !== null ? { x: row.panX, y: row.panY } : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get media item by ID
   */
  getMediaItemById(id: string): MediaItem | null {
    const stmt = this.db.prepare("SELECT * FROM media_items WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return null;

    return {
      id: row.id,
      url: row.url,
      type: row.type,
      title: row.title || undefined,
      thumb: row.thumb || undefined,
      start: row.start || undefined,
      end: row.end || undefined,
      zoom: row.zoom || undefined,
      pan: row.panX !== null && row.panY !== null ? { x: row.panX, y: row.panY } : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Create a new media item
   */
  createMediaItem(playlistId: string, item: CreateMediaItemInput & { id: string }): void {
    const now = new Date();

    // Get the highest position for this playlist
    const posStmt = this.db.prepare(
      "SELECT COALESCE(MAX(position), -1) as maxPos FROM media_items WHERE playlistId = ?"
    );
    const posRow = posStmt.get(playlistId) as { maxPos: number };
    const position = posRow.maxPos + 1;

    const stmt = this.db.prepare(`
      INSERT INTO media_items
      (id, playlistId, url, type, title, thumb, start, end, zoom, panX, panY, position, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      item.id,
      playlistId,
      item.url,
      item.type,
      item.title || null,
      item.thumb || null,
      item.start || null,
      item.end || null,
      item.zoom || null,
      item.pan?.x ?? null,
      item.pan?.y ?? null,
      position,
      now.toISOString(),
      now.toISOString()
    );
  }

  /**
   * Update a media item
   */
  updateMediaItem(id: string, updates: UpdateMediaItemInput): void {
    const existing = this.getMediaItemById(id);
    if (!existing) {
      throw new Error(`Media item ${id} not found`);
    }

    const merged = {
      title: updates.title !== undefined ? updates.title : existing.title,
      thumb: updates.thumb !== undefined ? updates.thumb : existing.thumb,
      start: updates.start !== undefined ? updates.start : existing.start,
      end: updates.end !== undefined ? updates.end : existing.end,
      zoom: updates.zoom !== undefined ? updates.zoom : existing.zoom,
      pan: updates.pan !== undefined ? updates.pan : existing.pan,
      updatedAt: new Date().toISOString(),
    };

    const stmt = this.db.prepare(`
      UPDATE media_items
      SET title = ?, thumb = ?, start = ?, end = ?, zoom = ?, panX = ?, panY = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.title || null,
      merged.thumb || null,
      merged.start || null,
      merged.end || null,
      merged.zoom || null,
      merged.pan?.x ?? null,
      merged.pan?.y ?? null,
      merged.updatedAt,
      id
    );
  }

  /**
   * Delete a media item
   */
  deleteMediaItem(id: string): void {
    // Get the item to know its position and playlist
    const item = this.db.prepare("SELECT playlistId, position FROM media_items WHERE id = ?").get(id) as any;
    if (!item) return;

    // Delete the item
    const deleteStmt = this.db.prepare("DELETE FROM media_items WHERE id = ?");
    deleteStmt.run(id);

    // Reorder remaining items
    const updateStmt = this.db.prepare(
      "UPDATE media_items SET position = position - 1 WHERE playlistId = ? AND position > ?"
    );
    updateStmt.run(item.playlistId, item.position);
  }

  /**
   * Reorder media items
   */
  reorderMediaItems(playlistId: string, itemIds: string[]): void {
    // Update position for each item based on its index in the array
    const stmt = this.db.prepare(
      "UPDATE media_items SET position = ?, updatedAt = ? WHERE id = ? AND playlistId = ?"
    );
    const now = new Date().toISOString();

    itemIds.forEach((id, index) => {
      stmt.run(index, now, id, playlistId);
    });
  }

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
    this.logger.info("Database connection closed");
  }
}


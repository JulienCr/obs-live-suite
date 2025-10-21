import Database from "better-sqlite3";
import { PathManager } from "../config/PathManager";
import { Logger } from "../utils/Logger";

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
      const tableInfo = this.db.prepare("PRAGMA table_info(themes)").all() as any[];
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

      CREATE INDEX IF NOT EXISTS idx_guests_displayName ON guests(displayName);
      CREATE INDEX IF NOT EXISTS idx_posters_profileIds ON posters(profileIds);
      CREATE INDEX IF NOT EXISTS idx_profiles_isActive ON profiles(isActive);
      CREATE INDEX IF NOT EXISTS idx_presets_profileId ON presets(profileId);
      CREATE INDEX IF NOT EXISTS idx_macros_profileId ON macros(profileId);
      CREATE INDEX IF NOT EXISTS idx_plugins_updateStatus ON plugins(updateStatus);
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
  getAllGuests(): unknown[] {
    const stmt = this.db.prepare("SELECT * FROM guests ORDER BY displayName ASC");
    const rows = stmt.all();
    return rows.map((row: any) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get guest by ID
   */
  getGuestById(id: string): unknown | null {
    const stmt = this.db.prepare("SELECT * FROM guests WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Create a new guest
   */
  createGuest(guest: any): void {
    console.log("[DB] Creating guest with data:", {
      id: guest.id,
      displayName: guest.displayName,
      subtitle: guest.subtitle,
      accentColor: guest.accentColor,
      avatarUrl: guest.avatarUrl,
    });
    
    const stmt = this.db.prepare(`
      INSERT INTO guests (id, displayName, subtitle, accentColor, avatarUrl, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      guest.id,
      guest.displayName,
      guest.subtitle || null,
      guest.accentColor,
      guest.avatarUrl || null,
      guest.createdAt.toISOString(),
      guest.updatedAt.toISOString()
    );
    
    console.log("[DB] Guest created successfully");
  }

  /**
   * Update a guest
   */
  updateGuest(id: string, updates: any): void {
    // Get existing guest to merge with updates
    const existing = this.getGuestById(id) as any;
    if (!existing) {
      throw new Error(`Guest with id ${id} not found`);
    }

    // Merge existing data with updates
    const merged = {
      displayName: updates.displayName !== undefined ? updates.displayName : existing.displayName,
      subtitle: updates.subtitle !== undefined ? updates.subtitle : existing.subtitle,
      accentColor: updates.accentColor !== undefined ? updates.accentColor : existing.accentColor,
      avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : existing.avatarUrl,
      updatedAt: updates.updatedAt || new Date(),
    };

    console.log("[DB] Updating guest:", id, "with merged data:", merged);

    const stmt = this.db.prepare(`
      UPDATE guests
      SET displayName = ?, subtitle = ?, accentColor = ?, avatarUrl = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.displayName,
      merged.subtitle || null,
      merged.accentColor,
      merged.avatarUrl || null,
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
  getAllPosters(): unknown[] {
    const stmt = this.db.prepare("SELECT * FROM posters ORDER BY createdAt DESC");
    const rows = stmt.all();
    return rows.map((row: any) => ({
      ...row,
      tags: JSON.parse(row.tags || "[]"),
      profileIds: JSON.parse(row.profileIds || "[]"),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get poster by ID
   */
  getPosterById(id: string): unknown | null {
    const stmt = this.db.prepare("SELECT * FROM posters WHERE id = ?");
    const row = stmt.get(id) as any;
    if (!row) return null;
    return {
      ...row,
      tags: JSON.parse(row.tags || "[]"),
      profileIds: JSON.parse(row.profileIds || "[]"),
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Create a new poster
   */
  createPoster(poster: any): void {
    const stmt = this.db.prepare(`
      INSERT INTO posters (id, title, fileUrl, type, duration, tags, profileIds, metadata, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      poster.createdAt.toISOString(),
      poster.updatedAt.toISOString()
    );
  }

  /**
   * Update a poster
   */
  updatePoster(id: string, updates: any): void {
    const stmt = this.db.prepare(`
      UPDATE posters
      SET title = ?, fileUrl = ?, type = ?, duration = ?, tags = ?, profileIds = ?, metadata = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      updates.title,
      updates.fileUrl,
      updates.type,
      updates.duration || null,
      JSON.stringify(updates.tags || []),
      JSON.stringify(updates.profileIds || []),
      updates.metadata ? JSON.stringify(updates.metadata) : null,
      updates.updatedAt.toISOString(),
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
  getAllProfiles(): unknown[] {
    const stmt = this.db.prepare("SELECT * FROM profiles ORDER BY isActive DESC, name ASC");
    const rows = stmt.all();
    return rows.map((row: any) => ({
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
  getProfileById(id: string): unknown | null {
    const stmt = this.db.prepare("SELECT * FROM profiles WHERE id = ?");
    const row = stmt.get(id) as any;
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
  getActiveProfile(): unknown | null {
    const stmt = this.db.prepare("SELECT * FROM profiles WHERE isActive = 1 LIMIT 1");
    const row = stmt.get() as any;
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
  createProfile(profile: any): void {
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
      profile.createdAt.toISOString(),
      profile.updatedAt.toISOString()
    );
  }

  /**
   * Update a profile
   */
  updateProfile(id: string, updates: any): void {
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
  getAllThemes(): unknown[] {
    const stmt = this.db.prepare("SELECT * FROM themes ORDER BY isGlobal DESC, name ASC");
    const rows = stmt.all();
    return rows.map((row: any) => ({
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
  getThemeById(id: string): unknown | null {
    const stmt = this.db.prepare("SELECT * FROM themes WHERE id = ?");
    const row = stmt.get(id) as any;
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
  createTheme(theme: any): void {
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
      theme.createdAt.toISOString(),
      theme.updatedAt.toISOString()
    );
  }

  /**
   * Update a theme
   */
  updateTheme(id: string, updates: any): void {
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

  /**
   * Close the database connection
   */
  close(): void {
    this.db.close();
    this.logger.info("Database connection closed");
  }
}


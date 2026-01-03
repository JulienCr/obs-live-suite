import { DatabaseService } from "@/lib/services/DatabaseService";
import { Logger } from "@/lib/utils/Logger";
import { safeJsonParse } from "@/lib/utils/safeJsonParse";
import type {
  DbProfile,
  DbProfileInput,
  DbProfileUpdate,
} from "@/lib/models/Database";

/**
 * Raw profile row from SQLite (before type conversion)
 */
type DbProfileRow = Omit<
  DbProfile,
  "isActive" | "posterRotation" | "audioSettings" | "createdAt" | "updatedAt"
> & {
  isActive: number;
  posterRotation: string;
  audioSettings: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * ProfileRepository handles all profile-related database operations.
 * Follows the singleton pattern for consistent database access.
 */
export class ProfileRepository {
  private static instance: ProfileRepository;
  private db: DatabaseService;
  private logger: Logger;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.logger = new Logger("ProfileRepository");
  }

  /**
   * Get the singleton instance of ProfileRepository
   */
  static getInstance(): ProfileRepository {
    if (!ProfileRepository.instance) {
      ProfileRepository.instance = new ProfileRepository();
    }
    return ProfileRepository.instance;
  }

  /**
   * Convert a raw database row to a typed DbProfile
   */
  private mapRowToProfile(row: DbProfileRow): DbProfile {
    return {
      ...row,
      isActive: Boolean(row.isActive),
      posterRotation: safeJsonParse<DbProfile["posterRotation"]>(
        row.posterRotation,
        []
      ),
      audioSettings: safeJsonParse<DbProfile["audioSettings"]>(
        row.audioSettings,
        {}
      ),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Get all profiles
   */
  getAll(): DbProfile[] {
    const stmt = this.db
      .getDb()
      .prepare("SELECT * FROM profiles ORDER BY isActive DESC, name ASC");
    const rows = stmt.all() as DbProfileRow[];
    return rows.map((row) => this.mapRowToProfile(row));
  }

  /**
   * Get profile by ID
   */
  getById(id: string): DbProfile | null {
    const stmt = this.db.getDb().prepare("SELECT * FROM profiles WHERE id = ?");
    const row = stmt.get(id) as DbProfileRow | undefined;
    if (!row) return null;
    return this.mapRowToProfile(row);
  }

  /**
   * Get active profile
   */
  getActive(): DbProfile | null {
    const stmt = this.db
      .getDb()
      .prepare("SELECT * FROM profiles WHERE isActive = 1 LIMIT 1");
    const row = stmt.get() as DbProfileRow | undefined;
    if (!row) return null;
    return this.mapRowToProfile(row);
  }

  /**
   * Create a new profile
   */
  create(profile: DbProfileInput): void {
    const now = new Date();
    const stmt = this.db.getDb().prepare(`
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
  update(id: string, updates: DbProfileUpdate): void {
    const stmt = this.db.getDb().prepare(`
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
  setActive(id: string): void {
    const db = this.db.getDb();
    // Deactivate all profiles
    db.prepare("UPDATE profiles SET isActive = 0").run();
    // Activate the specified profile
    db.prepare(
      "UPDATE profiles SET isActive = 1, updatedAt = ? WHERE id = ?"
    ).run(new Date().toISOString(), id);
  }

  /**
   * Delete a profile
   */
  delete(id: string): void {
    const stmt = this.db.getDb().prepare("DELETE FROM profiles WHERE id = ?");
    stmt.run(id);
  }
}

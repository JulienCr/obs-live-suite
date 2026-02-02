import { BaseRepository, ColumnTransformConfig } from "./BaseRepository";
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
export class ProfileRepository extends BaseRepository<
  DbProfile,
  DbProfileRow,
  DbProfileInput,
  DbProfileUpdate
> {
  private static instance: ProfileRepository;

  protected readonly tableName = "profiles";
  protected readonly loggerName = "ProfileRepository";
  protected readonly transformConfig: ColumnTransformConfig = {
    booleanColumns: ["isActive"],
    dateColumns: ["createdAt", "updatedAt"],
    jsonColumns: [
      { column: "posterRotation", defaultValue: [] },
      { column: "audioSettings", defaultValue: {} },
    ],
  };

  private constructor() {
    super();
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

  protected override getOrderBy(): string {
    return "isActive DESC, name ASC";
  }

  /**
   * Get active profile
   */
  getActive(): DbProfile | null {
    const stmt = this.rawDb.prepare(
      "SELECT * FROM profiles WHERE isActive = 1 LIMIT 1"
    );
    const row = stmt.get() as DbProfileRow | undefined;
    if (!row) return null;
    return this.transformRow(row);
  }

  /**
   * Create a new profile
   */
  create(profile: DbProfileInput): void {
    const now = new Date();
    const stmt = this.rawDb.prepare(`
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
      this.prepareValue(profile.posterRotation || []),
      this.prepareValue(profile.audioSettings || {}),
      this.prepareValue(profile.isActive),
      this.prepareValue(profile.createdAt || now),
      this.prepareValue(profile.updatedAt || now)
    );
  }

  /**
   * Update a profile
   */
  update(id: string, updates: DbProfileUpdate): void {
    const stmt = this.rawDb.prepare(`
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
      this.prepareValue(updates.posterRotation || []),
      this.prepareValue(updates.audioSettings || {}),
      this.prepareValue(updates.isActive),
      this.prepareValue(updates.updatedAt || new Date()),
      id
    );
  }

  /**
   * Set active profile (deactivates all others)
   */
  setActive(id: string): void {
    // Deactivate all profiles
    this.rawDb.prepare("UPDATE profiles SET isActive = 0").run();
    // Activate the specified profile
    this.rawDb.prepare(
      "UPDATE profiles SET isActive = 1, updatedAt = ? WHERE id = ?"
    ).run(new Date().toISOString(), id);
  }
}

import { DatabaseService } from "@/lib/services/DatabaseService";
import {
  DbPoster,
  DbPosterInput,
  DbPosterUpdate,
} from "@/lib/models/Database";
import { safeJsonParse, safeJsonParseOptional } from "@/lib/utils/safeJsonParse";
import { Logger } from "@/lib/utils/Logger";

/**
 * Raw poster row type as stored in SQLite database.
 * JSON fields are stored as strings and booleans as integers.
 */
type DbPosterRow = Omit<DbPoster, 'tags' | 'profileIds' | 'metadata' | 'isEnabled' | 'createdAt' | 'updatedAt'> & {
  tags: string;
  profileIds: string;
  metadata: string | null;
  isEnabled: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * PosterRepository handles all poster-related database operations.
 * Uses singleton pattern for consistent database access.
 */
export class PosterRepository {
  private static instance: PosterRepository;
  private db: DatabaseService;
  private logger: Logger;

  private constructor() {
    this.db = DatabaseService.getInstance();
    this.logger = new Logger("PosterRepository");
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): PosterRepository {
    if (!PosterRepository.instance) {
      PosterRepository.instance = new PosterRepository();
    }
    return PosterRepository.instance;
  }

  /**
   * Transform a raw database row to a DbPoster object.
   * Handles JSON parsing and type conversions.
   */
  private transformRow(row: DbPosterRow): DbPoster {
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
   * Get all posters
   * @param enabled - If true, return only enabled posters. If false, return only disabled posters. If undefined, return all.
   */
  getAll(enabled?: boolean): DbPoster[] {
    let rows: DbPosterRow[];

    if (enabled === undefined) {
      const stmt = this.db.getDb().prepare("SELECT * FROM posters ORDER BY createdAt DESC");
      rows = stmt.all() as DbPosterRow[];
    } else {
      const stmt = this.db.getDb().prepare(
        "SELECT * FROM posters WHERE isEnabled = ? ORDER BY createdAt DESC"
      );
      rows = stmt.all(enabled ? 1 : 0) as DbPosterRow[];
    }

    return rows.map((row) => this.transformRow(row));
  }

  /**
   * Get poster by ID
   */
  getById(id: string): DbPoster | null {
    const stmt = this.db.getDb().prepare("SELECT * FROM posters WHERE id = ?");
    const row = stmt.get(id) as DbPosterRow | undefined;
    if (!row) return null;
    return this.transformRow(row);
  }

  /**
   * Create a new poster
   */
  create(poster: DbPosterInput): void {
    const now = new Date();
    const stmt = this.db.getDb().prepare(`
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
  update(id: string, updates: DbPosterUpdate): void {
    // Get existing poster to merge with updates
    const existing = this.getById(id);
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

    const stmt = this.db.getDb().prepare(`
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
  delete(id: string): void {
    const stmt = this.db.getDb().prepare("DELETE FROM posters WHERE id = ?");
    stmt.run(id);
  }
}

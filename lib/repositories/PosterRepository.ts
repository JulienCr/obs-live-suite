import { EnabledBaseRepository, ColumnTransformConfig } from "./BaseRepository";
import type {
  DbPoster,
  DbPosterInput,
  DbPosterUpdate,
} from "@/lib/models/Database";

/**
 * Raw poster row type as stored in SQLite database.
 * JSON fields are stored as strings and booleans as integers.
 */
type DbPosterRow = Omit<
  DbPoster,
  "tags" | "profileIds" | "metadata" | "isEnabled" | "endBehavior" | "createdAt" | "updatedAt"
> & {
  tags: string;
  profileIds: string;
  metadata: string | null;
  isEnabled: number;
  endBehavior: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * PosterRepository handles all poster-related database operations.
 * Uses singleton pattern for consistent database access.
 */
export class PosterRepository extends EnabledBaseRepository<
  DbPoster,
  DbPosterRow,
  DbPosterInput,
  DbPosterUpdate
> {
  private static instance: PosterRepository;

  protected readonly tableName = "posters";
  protected readonly loggerName = "PosterRepository";
  protected readonly transformConfig: ColumnTransformConfig = {
    booleanColumns: ["isEnabled"],
    dateColumns: ["createdAt", "updatedAt"],
    jsonColumns: [
      { column: "tags", defaultValue: [] },
      { column: "profileIds", defaultValue: [] },
      { column: "metadata", defaultValue: undefined, optional: true },
    ],
  };

  private constructor() {
    super();
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

  protected override getOrderBy(): string {
    return "createdAt DESC";
  }

  /**
   * Override transformRow to handle endBehavior type casting
   */
  protected override transformRow(row: DbPosterRow): DbPoster {
    const base = super.transformRow(row);
    return {
      ...base,
      endBehavior: row.endBehavior as DbPoster["endBehavior"],
    };
  }

  /**
   * Create a new poster
   */
  create(poster: DbPosterInput): void {
    const now = new Date();
    const stmt = this.rawDb.prepare(`
      INSERT INTO posters (id, title, description, source, fileUrl, type, duration, tags, profileIds, metadata, chatMessage, isEnabled, parentPosterId, startTime, endTime, thumbnailUrl, endBehavior, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      poster.id,
      poster.title,
      poster.description || null,
      poster.source || null,
      poster.fileUrl,
      poster.type,
      poster.duration || null,
      this.prepareValue(poster.tags || []),
      this.prepareValue(poster.profileIds || []),
      poster.metadata ? this.prepareValue(poster.metadata) : null,
      poster.chatMessage || null,
      this.prepareValue(poster.isEnabled),
      poster.parentPosterId || null,
      poster.startTime ?? null,
      poster.endTime ?? null,
      poster.thumbnailUrl || null,
      poster.endBehavior || null,
      this.prepareValue(poster.createdAt || now),
      this.prepareValue(poster.updatedAt || now)
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
      parentPosterId: updates.parentPosterId !== undefined ? updates.parentPosterId : existing.parentPosterId,
      startTime: updates.startTime !== undefined ? updates.startTime : existing.startTime,
      endTime: updates.endTime !== undefined ? updates.endTime : existing.endTime,
      thumbnailUrl: updates.thumbnailUrl !== undefined ? updates.thumbnailUrl : existing.thumbnailUrl,
      endBehavior: updates.endBehavior !== undefined ? updates.endBehavior : existing.endBehavior,
      updatedAt: updates.updatedAt || new Date(),
    };

    const stmt = this.rawDb.prepare(`
      UPDATE posters
      SET title = ?, description = ?, source = ?, fileUrl = ?, type = ?, duration = ?, tags = ?, profileIds = ?, metadata = ?, chatMessage = ?, isEnabled = ?, parentPosterId = ?, startTime = ?, endTime = ?, thumbnailUrl = ?, endBehavior = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.title,
      merged.description || null,
      merged.source || null,
      merged.fileUrl,
      merged.type,
      merged.duration || null,
      this.prepareValue(merged.tags || []),
      this.prepareValue(merged.profileIds || []),
      merged.metadata ? this.prepareValue(merged.metadata) : null,
      merged.chatMessage || null,
      this.prepareValue(merged.isEnabled),
      merged.parentPosterId || null,
      merged.startTime ?? null,
      merged.endTime ?? null,
      merged.thumbnailUrl || null,
      merged.endBehavior || null,
      this.prepareValue(merged.updatedAt),
      id
    );
  }

  /**
   * Get all sub-videos for a parent poster
   * @param parentId - The ID of the parent poster
   */
  getSubVideos(parentId: string): DbPoster[] {
    const stmt = this.rawDb.prepare(
      "SELECT * FROM posters WHERE parentPosterId = ? ORDER BY startTime ASC"
    );
    const rows = stmt.all(parentId) as DbPosterRow[];
    return rows.map((row) => this.transformRow(row));
  }

  /**
   * Get the parent poster for a sub-video
   * @param subVideoId - The ID of the sub-video
   */
  getParentPoster(subVideoId: string): DbPoster | null {
    const subVideo = this.getById(subVideoId);
    if (!subVideo || !subVideo.parentPosterId) {
      return null;
    }
    return this.getById(subVideo.parentPosterId);
  }

  /**
   * Check if a poster has sub-videos
   * @param posterId - The ID of the poster to check
   */
  hasSubVideos(posterId: string): boolean {
    const stmt = this.rawDb.prepare(
      "SELECT COUNT(*) as count FROM posters WHERE parentPosterId = ?"
    );
    const result = stmt.get(posterId) as { count: number };
    return result.count > 0;
  }

  /**
   * Get count of sub-videos for a parent poster
   * @param parentId - The ID of the parent poster
   */
  getSubVideoCount(parentId: string): number {
    const stmt = this.rawDb.prepare(
      "SELECT COUNT(*) as count FROM posters WHERE parentPosterId = ?"
    );
    const result = stmt.get(parentId) as { count: number };
    return result.count;
  }
}

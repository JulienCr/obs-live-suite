import { DatabaseService } from "@/lib/services/DatabaseService";
import { Logger } from "@/lib/utils/Logger";
import { safeJsonParse, safeJsonParseOptional } from "@/lib/utils/safeJsonParse";
import type { DbCueMessage, DbCueMessageInput, DbCueMessageUpdate } from "@/lib/models/Database";

/**
 * Raw row type from SQLite before parsing JSON fields
 */
type RawCueMessageRow = Omit<
  DbCueMessage,
  "pinned" | "actions" | "countdownPayload" | "contextPayload" | "questionPayload" | "seenBy" | "ackedBy"
> & {
  pinned: number;
  actions: string;
  countdownPayload: string | null;
  contextPayload: string | null;
  questionPayload: string | null;
  seenBy: string;
  ackedBy: string;
};

/**
 * CueMessageRepository handles all cue message database operations
 */
export class CueMessageRepository {
  private static instance: CueMessageRepository;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger("CueMessageRepository");
  }

  /**
   * Get singleton instance
   */
  static getInstance(): CueMessageRepository {
    if (!CueMessageRepository.instance) {
      CueMessageRepository.instance = new CueMessageRepository();
    }
    return CueMessageRepository.instance;
  }

  /**
   * Get the database instance
   */
  private get db() {
    return DatabaseService.getInstance().getDb();
  }

  /**
   * Parse a raw SQLite row into a DbCueMessage
   */
  private parseRow(row: RawCueMessageRow): DbCueMessage {
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
   * Get messages by room ID with optional limit and cursor
   */
  getByRoom(roomId: string, limit: number = 50, cursor?: number): DbCueMessage[] {
    let query = "SELECT * FROM cue_messages WHERE roomId = ?";
    const params: (string | number)[] = [roomId];

    if (cursor) {
      query += " AND createdAt < ?";
      params.push(cursor);
    }

    query += " ORDER BY createdAt DESC LIMIT ?";
    params.push(limit);

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as RawCueMessageRow[];

    return rows.map((row) => this.parseRow(row));
  }

  /**
   * Get pinned messages by room ID
   */
  getPinned(roomId: string): DbCueMessage[] {
    const stmt = this.db.prepare("SELECT * FROM cue_messages WHERE roomId = ? AND pinned = 1 ORDER BY createdAt DESC");
    const rows = stmt.all(roomId) as RawCueMessageRow[];

    return rows.map((row) => this.parseRow(row));
  }

  /**
   * Get message by ID
   */
  getById(id: string): DbCueMessage | null {
    const stmt = this.db.prepare("SELECT * FROM cue_messages WHERE id = ?");
    const row = stmt.get(id) as RawCueMessageRow | undefined;

    if (!row) return null;

    return this.parseRow(row);
  }

  /**
   * Create a new cue message
   */
  create(message: DbCueMessageInput): DbCueMessage {
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

    return this.getById(message.id)!;
  }

  /**
   * Update a cue message
   */
  update(id: string, updates: DbCueMessageUpdate): void {
    const existing = this.getById(id);
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
  delete(id: string): void {
    const stmt = this.db.prepare("DELETE FROM cue_messages WHERE id = ?");
    stmt.run(id);
  }

  /**
   * Delete old messages from a room, keeping only the most recent N
   */
  deleteOld(roomId: string, keepCount: number = 100): void {
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
  clearRoom(roomId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM cue_messages
      WHERE roomId = ?
    `);
    stmt.run(roomId);
  }
}

import { DatabaseService } from "@/lib/services/DatabaseService";
import { Logger } from "@/lib/utils/Logger";
import { safeJsonParse, safeJsonParseOptional } from "@/lib/utils/safeJsonParse";
import type { DbRoom, DbRoomInput, DbRoomUpdate } from "@/lib/models/Database";

/**
 * RoomRepository handles all room-related database operations
 */
export class RoomRepository {
  private static instance: RoomRepository;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger("RoomRepository");
  }

  /**
   * Get singleton instance
   */
  static getInstance(): RoomRepository {
    if (!RoomRepository.instance) {
      RoomRepository.instance = new RoomRepository();
    }
    return RoomRepository.instance;
  }

  /**
   * Get the database instance
   */
  private get db() {
    return DatabaseService.getInstance().getDb();
  }

  /**
   * Get all rooms
   */
  getAll(): DbRoom[] {
    const stmt = this.db.prepare("SELECT * FROM rooms ORDER BY name ASC");
    const rows = stmt.all() as Array<
      Omit<
        DbRoom,
        | "quickReplies"
        | "canSendCustomMessages"
        | "streamerbotConnection"
        | "allowPresenterToSendMessage"
        | "createdAt"
        | "updatedAt"
      > & {
        quickReplies: string;
        canSendCustomMessages: number;
        streamerbotConnection: string | null;
        allowPresenterToSendMessage: number;
        createdAt: string;
        updatedAt: string;
      }
    >;
    return rows.map((row) => ({
      ...row,
      quickReplies: safeJsonParse<DbRoom["quickReplies"]>(row.quickReplies, []),
      canSendCustomMessages: Boolean(row.canSendCustomMessages),
      streamerbotConnection:
        safeJsonParseOptional<DbRoom["streamerbotConnection"]>(row.streamerbotConnection) ?? null,
      allowPresenterToSendMessage: Boolean(row.allowPresenterToSendMessage),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get room by ID
   */
  getById(id: string): DbRoom | null {
    const stmt = this.db.prepare("SELECT * FROM rooms WHERE id = ?");
    const row = stmt.get(id) as
      | (Omit<
          DbRoom,
          | "quickReplies"
          | "canSendCustomMessages"
          | "streamerbotConnection"
          | "allowPresenterToSendMessage"
          | "createdAt"
          | "updatedAt"
        > & {
          quickReplies: string;
          canSendCustomMessages: number;
          streamerbotConnection: string | null;
          allowPresenterToSendMessage: number;
          createdAt: string;
          updatedAt: string;
        })
      | undefined;
    if (!row) return null;
    return {
      ...row,
      quickReplies: safeJsonParse<DbRoom["quickReplies"]>(row.quickReplies, []),
      canSendCustomMessages: Boolean(row.canSendCustomMessages),
      streamerbotConnection:
        safeJsonParseOptional<DbRoom["streamerbotConnection"]>(row.streamerbotConnection) ?? null,
      allowPresenterToSendMessage: Boolean(row.allowPresenterToSendMessage),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Create a new room
   */
  create(room: DbRoomInput): void {
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
  update(id: string, updates: DbRoomUpdate): void {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Room with id ${id} not found`);
    }

    const merged = {
      name: updates.name !== undefined ? updates.name : existing.name,
      vdoNinjaUrl: updates.vdoNinjaUrl !== undefined ? updates.vdoNinjaUrl : existing.vdoNinjaUrl,
      twitchChatUrl:
        updates.twitchChatUrl !== undefined ? updates.twitchChatUrl : existing.twitchChatUrl,
      quickReplies:
        updates.quickReplies !== undefined ? updates.quickReplies : existing.quickReplies,
      canSendCustomMessages:
        updates.canSendCustomMessages !== undefined
          ? updates.canSendCustomMessages
          : existing.canSendCustomMessages,
      streamerbotConnection:
        updates.streamerbotConnection !== undefined
          ? updates.streamerbotConnection
          : existing.streamerbotConnection,
      allowPresenterToSendMessage:
        updates.allowPresenterToSendMessage !== undefined
          ? updates.allowPresenterToSendMessage
          : existing.allowPresenterToSendMessage,
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
  delete(id: string): void {
    const stmt = this.db.prepare("DELETE FROM rooms WHERE id = ?");
    stmt.run(id);
  }
}

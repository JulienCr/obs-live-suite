import { SingletonRepository } from "@/lib/repositories/SingletonRepository";
import { safeJsonParseOptional } from "@/lib/utils/safeJsonParse";
import { DATABASE } from "@/lib/config/Constants";
import type {
  DbStreamerbotChatMessage,
  DbStreamerbotChatMessageInput,
} from "@/lib/models/Database";

/**
 * ChatMessageRepository handles all streamerbot chat message database operations.
 * Uses singleton pattern for consistent database access.
 */
export class ChatMessageRepository extends SingletonRepository {
  private static instance: ChatMessageRepository;
  private readonly CHAT_BUFFER_SIZE = DATABASE.CHAT_BUFFER_SIZE;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ChatMessageRepository {
    if (!ChatMessageRepository.instance) {
      ChatMessageRepository.instance = new ChatMessageRepository();
    }
    return ChatMessageRepository.instance;
  }

  /**
   * Get recent chat messages, ordered by timestamp descending
   */
  getStreamerbotChatMessages(limit: number = DATABASE.CHAT_BUFFER_SIZE): DbStreamerbotChatMessage[] {
    const stmt = this.rawDb.prepare(`
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
    const insertStmt = this.rawDb.prepare(`
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
    const countStmt = this.rawDb.prepare("SELECT COUNT(*) as count FROM streamerbot_chat_messages");
    const { count } = countStmt.get() as { count: number };

    if (count > this.CHAT_BUFFER_SIZE) {
      // Get the createdAt of the Nth newest message (threshold)
      const thresholdStmt = this.rawDb.prepare(`
        SELECT createdAt FROM streamerbot_chat_messages
        ORDER BY createdAt DESC
        LIMIT 1 OFFSET ?
      `);
      const row = thresholdStmt.get(this.CHAT_BUFFER_SIZE - 1) as { createdAt: number } | undefined;

      if (row) {
        const deleteStmt = this.rawDb.prepare(`
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
    const stmt = this.rawDb.prepare("DELETE FROM streamerbot_chat_messages");
    stmt.run();
  }
}

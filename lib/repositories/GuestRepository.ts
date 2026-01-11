import { DatabaseService } from "@/lib/services/DatabaseService";
import { Logger } from "@/lib/utils/Logger";
import type { DbGuest, DbGuestInput, DbGuestUpdate } from "@/lib/models/Database";

/**
 * GuestRepository handles all guest-related database operations
 */
export class GuestRepository {
  private static instance: GuestRepository;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger("GuestRepository");
  }

  /**
   * Get singleton instance
   */
  static getInstance(): GuestRepository {
    if (!GuestRepository.instance) {
      GuestRepository.instance = new GuestRepository();
    }
    return GuestRepository.instance;
  }

  /**
   * Get the database instance
   */
  private get db() {
    return DatabaseService.getInstance().getDb();
  }

  /**
   * Get all guests
   * @param enabled - Optional filter: true for enabled only, false for disabled only, undefined for all
   */
  getAll(enabled?: boolean): DbGuest[] {
    type GuestRow = Omit<DbGuest, "isEnabled" | "createdAt" | "updatedAt"> & {
      isEnabled: number;
      createdAt: string;
      updatedAt: string;
    };

    let rows: GuestRow[];

    if (enabled === undefined) {
      const stmt = this.db.prepare("SELECT * FROM guests ORDER BY displayName ASC");
      rows = stmt.all() as GuestRow[];
    } else {
      const stmt = this.db.prepare(
        "SELECT * FROM guests WHERE isEnabled = ? ORDER BY displayName ASC"
      );
      rows = stmt.all(enabled ? 1 : 0) as GuestRow[];
    }

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
  getById(id: string): DbGuest | null {
    const stmt = this.db.prepare("SELECT * FROM guests WHERE id = ?");
    const row = stmt.get(id) as
      | (Omit<DbGuest, "isEnabled" | "createdAt" | "updatedAt"> & {
          isEnabled: number;
          createdAt: string;
          updatedAt: string;
        })
      | undefined;
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
  create(guest: DbGuestInput): void {
    const now = new Date();
    this.logger.debug("Creating guest", {
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

    this.logger.debug("Guest created successfully");
  }

  /**
   * Update a guest
   */
  update(id: string, updates: DbGuestUpdate): void {
    // Get existing guest to merge with updates
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Guest with id ${id} not found`);
    }

    // Merge existing data with updates
    const merged = {
      displayName:
        updates.displayName !== undefined ? updates.displayName : existing.displayName,
      subtitle: updates.subtitle !== undefined ? updates.subtitle : existing.subtitle,
      accentColor:
        updates.accentColor !== undefined ? updates.accentColor : existing.accentColor,
      avatarUrl: updates.avatarUrl !== undefined ? updates.avatarUrl : existing.avatarUrl,
      chatMessage:
        updates.chatMessage !== undefined ? updates.chatMessage : existing.chatMessage,
      isEnabled: updates.isEnabled !== undefined ? updates.isEnabled : existing.isEnabled,
      updatedAt: updates.updatedAt || new Date(),
    };

    this.logger.debug("Updating guest", { id, merged });

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
  delete(id: string): void {
    const stmt = this.db.prepare("DELETE FROM guests WHERE id = ?");
    stmt.run(id);
  }
}

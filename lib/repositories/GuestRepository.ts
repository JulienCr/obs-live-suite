import { EnabledBaseRepository, ColumnTransformConfig } from "./BaseRepository";
import type { DbGuest, DbGuestInput, DbGuestUpdate } from "@/lib/models/Database";

/**
 * Raw guest row type as stored in SQLite database.
 */
type DbGuestRow = Omit<DbGuest, "isEnabled" | "createdAt" | "updatedAt"> & {
  isEnabled: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * GuestRepository handles all guest-related database operations.
 * Uses singleton pattern for consistent database access.
 */
export class GuestRepository extends EnabledBaseRepository<
  DbGuest,
  DbGuestRow,
  DbGuestInput,
  DbGuestUpdate
> {
  private static instance: GuestRepository;

  protected readonly tableName = "guests";
  protected readonly loggerName = "GuestRepository";
  protected readonly transformConfig: ColumnTransformConfig = {
    booleanColumns: ["isEnabled"],
    dateColumns: ["createdAt", "updatedAt"],
  };

  private constructor() {
    super();
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

  protected override getOrderBy(): string {
    return "displayName ASC";
  }

  /**
   * Create a new guest
   */
  create(guest: DbGuestInput): void {
    const now = new Date();
    this.getLogger().debug("Creating guest", {
      id: guest.id,
      displayName: guest.displayName,
    });

    const stmt = this.rawDb.prepare(`
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
      this.prepareValue(guest.isEnabled),
      this.prepareValue(guest.createdAt || now),
      this.prepareValue(guest.updatedAt || now)
    );

    this.getLogger().debug("Guest created successfully");
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

    this.getLogger().debug("Updating guest", { id, merged });

    const stmt = this.rawDb.prepare(`
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
      this.prepareValue(merged.isEnabled),
      this.prepareValue(merged.updatedAt),
      id
    );
  }
}

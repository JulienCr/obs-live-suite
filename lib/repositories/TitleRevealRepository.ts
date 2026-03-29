import { BaseRepository, ColumnTransformConfig } from "./BaseRepository";
import type { DbTitleReveal, DbTitleRevealInput, DbTitleRevealUpdate } from "@/lib/models/Database";

/**
 * Raw title reveal row type as stored in SQLite database.
 */
type DbTitleRevealRow = Omit<DbTitleReveal, "lines" | "createdAt" | "updatedAt" | "midiEnabled"> & {
  lines: string;
  createdAt: string;
  updatedAt: string;
  midiEnabled: number;
};

/**
 * TitleRevealRepository handles all title reveal database operations.
 * Uses singleton pattern for consistent database access.
 */
export class TitleRevealRepository extends BaseRepository<
  DbTitleReveal,
  DbTitleRevealRow,
  DbTitleRevealInput,
  DbTitleRevealUpdate
> {
  private static instance: TitleRevealRepository;

  protected readonly tableName = "title_reveals";
  protected readonly loggerName = "TitleRevealRepository";
  protected readonly transformConfig: ColumnTransformConfig = {
    dateColumns: ["createdAt", "updatedAt"],
    jsonColumns: [{ column: "lines", defaultValue: [] }],
    booleanColumns: ["midiEnabled"],
  };

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): TitleRevealRepository {
    if (!TitleRevealRepository.instance) {
      TitleRevealRepository.instance = new TitleRevealRepository();
    }
    return TitleRevealRepository.instance;
  }

  protected override getOrderBy(): string {
    return "sortOrder ASC, name ASC";
  }

  /**
   * Create a new title reveal
   */
  create(input: DbTitleRevealInput): void {
    const now = new Date();
    this.getLogger().debug("Creating title reveal", {
      id: input.id,
      name: input.name,
    });

    const stmt = this.rawDb.prepare(`
      INSERT INTO title_reveals (id, name, lines, logoUrl, fontFamily, fontSize, rotation, colorText, colorGhostBlue, colorGhostNavy, duration, soundUrl, midiEnabled, midiChannel, midiCc, midiValue, sortOrder, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      input.id,
      input.name,
      this.prepareValue(input.lines),
      input.logoUrl || null,
      input.fontFamily,
      input.fontSize,
      input.rotation,
      input.colorText,
      input.colorGhostBlue,
      input.colorGhostNavy,
      input.duration,
      input.soundUrl || null,
      input.midiEnabled ? 1 : 0,
      input.midiChannel,
      input.midiCc,
      input.midiValue,
      input.sortOrder,
      this.prepareValue(input.createdAt || now),
      this.prepareValue(input.updatedAt || now)
    );
  }

  /**
   * Update a title reveal
   */
  update(id: string, updates: DbTitleRevealUpdate): void {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Title reveal with id ${id} not found`);
    }

    const merged = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      ),
      updatedAt: updates.updatedAt || new Date(),
    };

    const stmt = this.rawDb.prepare(`
      UPDATE title_reveals
      SET name = ?, lines = ?, logoUrl = ?, fontFamily = ?, fontSize = ?, rotation = ?,
          colorText = ?, colorGhostBlue = ?, colorGhostNavy = ?, duration = ?,
          soundUrl = ?, midiEnabled = ?, midiChannel = ?, midiCc = ?, midiValue = ?,
          sortOrder = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.name,
      this.prepareValue(merged.lines),
      merged.logoUrl || null,
      merged.fontFamily,
      merged.fontSize,
      merged.rotation,
      merged.colorText,
      merged.colorGhostBlue,
      merged.colorGhostNavy,
      merged.duration,
      merged.soundUrl || null,
      merged.midiEnabled ? 1 : 0,
      merged.midiChannel,
      merged.midiCc,
      merged.midiValue,
      merged.sortOrder,
      this.prepareValue(merged.updatedAt),
      id
    );
  }

  /**
   * Reorder title reveals by list of IDs
   */
  reorder(ids: string[]): void {
    const stmt = this.rawDb.prepare(
      `UPDATE title_reveals SET sortOrder = ?, updatedAt = ? WHERE id = ?`
    );
    const now = this.prepareValue(new Date());
    const transaction = this.rawDb.transaction(() => {
      ids.forEach((id, index) => {
        stmt.run(index, now, id);
      });
    });
    transaction();
  }
}

import { EnabledBaseRepository, ColumnTransformConfig } from "./BaseRepository";
import type { DbTextPreset, DbTextPresetInput, DbTextPresetUpdate } from "@/lib/models/Database";

/**
 * Raw text preset row type as stored in SQLite database.
 */
type DbTextPresetRow = Omit<DbTextPreset, "isEnabled" | "createdAt" | "updatedAt"> & {
  isEnabled: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * TextPresetRepository handles all text preset database operations.
 * Uses singleton pattern for consistent database access.
 */
export class TextPresetRepository extends EnabledBaseRepository<
  DbTextPreset,
  DbTextPresetRow,
  DbTextPresetInput,
  DbTextPresetUpdate
> {
  private static instance: TextPresetRepository;

  protected readonly tableName = "text_presets";
  protected readonly loggerName = "TextPresetRepository";
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
  static getInstance(): TextPresetRepository {
    if (!TextPresetRepository.instance) {
      TextPresetRepository.instance = new TextPresetRepository();
    }
    return TextPresetRepository.instance;
  }

  protected override getOrderBy(): string {
    return "name ASC";
  }

  /**
   * Create a new text preset
   */
  create(preset: DbTextPresetInput): void {
    const now = new Date();
    this.getLogger().debug("Creating text preset", {
      id: preset.id,
      name: preset.name,
    });

    const stmt = this.rawDb.prepare(`
      INSERT INTO text_presets (id, name, body, side, imageUrl, imageAlt, isEnabled, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      preset.id,
      preset.name,
      preset.body,
      preset.side,
      preset.imageUrl || null,
      preset.imageAlt || null,
      this.prepareValue(preset.isEnabled),
      this.prepareValue(preset.createdAt || now),
      this.prepareValue(preset.updatedAt || now)
    );
  }

  /**
   * Update a text preset
   */
  update(id: string, updates: DbTextPresetUpdate): void {
    const existing = this.getById(id);
    if (!existing) {
      throw new Error(`Text preset with id ${id} not found`);
    }

    const merged = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(updates).filter(([, v]) => v !== undefined)
      ),
      updatedAt: updates.updatedAt || new Date(),
    };

    const stmt = this.rawDb.prepare(`
      UPDATE text_presets
      SET name = ?, body = ?, side = ?, imageUrl = ?, imageAlt = ?, isEnabled = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      merged.name,
      merged.body,
      merged.side,
      merged.imageUrl || null,
      merged.imageAlt || null,
      this.prepareValue(merged.isEnabled),
      this.prepareValue(merged.updatedAt),
      id
    );
  }
}

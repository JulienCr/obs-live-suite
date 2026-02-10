import { SingletonRepository } from "@/lib/repositories/SingletonRepository";
import type { DbPanelColor } from "@/lib/models/Database";

/**
 * PanelColorRepository handles all panel color database operations.
 * Uses singleton pattern for consistent database access.
 */
export class PanelColorRepository extends SingletonRepository {
  private static instance: PanelColorRepository;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PanelColorRepository {
    if (!PanelColorRepository.instance) {
      PanelColorRepository.instance = new PanelColorRepository();
    }
    return PanelColorRepository.instance;
  }

  /**
   * Get all panel colors
   */
  getAllPanelColors(): DbPanelColor[] {
    const stmt = this.rawDb.prepare("SELECT * FROM panel_colors ORDER BY panelId ASC");
    const rows = stmt.all() as Array<Omit<DbPanelColor, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }>;
    return rows.map((row) => ({
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));
  }

  /**
   * Get panel color by panel ID
   */
  getPanelColorByPanelId(panelId: string): DbPanelColor | null {
    const stmt = this.rawDb.prepare("SELECT * FROM panel_colors WHERE panelId = ?");
    const row = stmt.get(panelId) as (Omit<DbPanelColor, 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string }) | undefined;
    if (!row) return null;
    return {
      ...row,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Upsert panel color scheme (create or update)
   */
  upsertPanelColor(panelId: string, scheme: string): DbPanelColor {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const stmt = this.rawDb.prepare(`
      INSERT INTO panel_colors (id, panelId, scheme, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(panelId) DO UPDATE SET scheme = excluded.scheme, updatedAt = excluded.updatedAt
    `);
    stmt.run(id, panelId, scheme, now, now);

    return this.getPanelColorByPanelId(panelId)!;
  }

  /**
   * Delete panel color (reset to default)
   */
  deletePanelColor(panelId: string): void {
    const stmt = this.rawDb.prepare("DELETE FROM panel_colors WHERE panelId = ?");
    stmt.run(panelId);
  }
}

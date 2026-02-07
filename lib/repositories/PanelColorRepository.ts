import { DatabaseConnector } from "@/lib/services/DatabaseConnector";
import { Logger } from "@/lib/utils/Logger";
import type { DbPanelColor } from "@/lib/models/Database";

/**
 * PanelColorRepository handles all panel color database operations.
 * Uses singleton pattern for consistent database access.
 */
export class PanelColorRepository {
  private static instance: PanelColorRepository;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger("PanelColorRepository");
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

  private get db() {
    return DatabaseConnector.getInstance().getDb();
  }

  /**
   * Get all panel colors
   */
  getAllPanelColors(): DbPanelColor[] {
    const stmt = this.db.prepare("SELECT * FROM panel_colors ORDER BY panelId ASC");
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
    const stmt = this.db.prepare("SELECT * FROM panel_colors WHERE panelId = ?");
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
    const existing = this.getPanelColorByPanelId(panelId);
    const now = new Date();

    if (existing) {
      // Update existing
      const stmt = this.db.prepare(`
        UPDATE panel_colors SET scheme = ?, updatedAt = ? WHERE panelId = ?
      `);
      stmt.run(scheme, now.toISOString(), panelId);
    } else {
      // Create new
      const id = crypto.randomUUID();
      const stmt = this.db.prepare(`
        INSERT INTO panel_colors (id, panelId, scheme, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      stmt.run(id, panelId, scheme, now.toISOString(), now.toISOString());
    }

    return this.getPanelColorByPanelId(panelId)!;
  }

  /**
   * Delete panel color (reset to default)
   */
  deletePanelColor(panelId: string): void {
    const stmt = this.db.prepare("DELETE FROM panel_colors WHERE panelId = ?");
    stmt.run(panelId);
  }
}

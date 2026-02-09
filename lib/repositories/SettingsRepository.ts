import { DatabaseConnector } from "@/lib/services/DatabaseConnector";

/**
 * SettingsRepository handles all settings key-value database operations.
 * Uses singleton pattern for consistent database access.
 */
export class SettingsRepository {
  private static instance: SettingsRepository;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): SettingsRepository {
    if (!SettingsRepository.instance) {
      SettingsRepository.instance = new SettingsRepository();
    }
    return SettingsRepository.instance;
  }

  private get db() {
    return DatabaseConnector.getInstance().getDb();
  }

  /**
   * Get a setting by key
   */
  getSetting(key: string): string | null {
    const stmt = this.db.prepare("SELECT value FROM settings WHERE key = ?");
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value ?? null;
  }

  /**
   * Set a setting value
   */
  setSetting(key: string, value: string): void {
    const stmt = this.db.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)"
    );
    stmt.run(key, value, new Date().toISOString());
  }

  /**
   * Delete a setting
   */
  deleteSetting(key: string): void {
    const stmt = this.db.prepare("DELETE FROM settings WHERE key = ?");
    stmt.run(key);
  }

  /**
   * Get all settings
   */
  getAllSettings(): Record<string, string> {
    const stmt = this.db.prepare("SELECT key, value FROM settings");
    const rows = stmt.all() as Array<{ key: string; value: string }>;
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }
}

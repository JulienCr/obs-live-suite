import { SingletonRepository } from "@/lib/repositories/SingletonRepository";

/**
 * SettingsRepository handles all settings key-value database operations.
 * Uses singleton pattern for consistent database access.
 */
export class SettingsRepository extends SingletonRepository {
  private static instance: SettingsRepository;

  private constructor() {
    super();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SettingsRepository {
    if (!SettingsRepository.instance) {
      SettingsRepository.instance = new SettingsRepository();
    }
    return SettingsRepository.instance;
  }

  /**
   * Get a setting by key
   */
  getSetting(key: string): string | null {
    const stmt = this.rawDb.prepare("SELECT value FROM settings WHERE key = ?");
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value ?? null;
  }

  /**
   * Set a setting value
   */
  setSetting(key: string, value: string): void {
    const stmt = this.rawDb.prepare(
      "INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)"
    );
    stmt.run(key, value, new Date().toISOString());
  }

  /**
   * Delete a setting
   */
  deleteSetting(key: string): void {
    const stmt = this.rawDb.prepare("DELETE FROM settings WHERE key = ?");
    stmt.run(key);
  }

  /**
   * Get all settings
   */
  getAllSettings(): Record<string, string> {
    const stmt = this.rawDb.prepare("SELECT key, value FROM settings");
    const rows = stmt.all() as Array<{ key: string; value: string }>;
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }
}

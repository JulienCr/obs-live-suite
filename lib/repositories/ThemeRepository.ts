import { DatabaseService } from "@/lib/services/DatabaseService";
import { Logger } from "@/lib/utils/Logger";
import { safeJsonParse } from "@/lib/utils/safeJsonParse";
import { LAYOUT_DEFAULTS, LOWER_THIRD_ANIMATION } from "@/lib/config/Constants";
import type { DbTheme, DbThemeInput, DbThemeUpdate } from "@/lib/models/Database";

/**
 * Raw theme row type as stored in SQLite
 */
type DbThemeRow = Omit<
  DbTheme,
  | "colors"
  | "lowerThirdFont"
  | "lowerThirdLayout"
  | "lowerThirdAnimation"
  | "countdownFont"
  | "countdownLayout"
  | "posterLayout"
  | "isGlobal"
  | "createdAt"
  | "updatedAt"
> & {
  colors: string;
  lowerThirdFont: string;
  lowerThirdLayout: string;
  lowerThirdAnimation?: string;
  countdownFont: string;
  countdownLayout: string;
  posterLayout: string;
  isGlobal: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * ThemeRepository handles all theme-related database operations
 */
export class ThemeRepository {
  private static instance: ThemeRepository;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger("ThemeRepository");
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ThemeRepository {
    if (!ThemeRepository.instance) {
      ThemeRepository.instance = new ThemeRepository();
    }
    return ThemeRepository.instance;
  }

  /**
   * Get the database instance
   */
  private get db() {
    return DatabaseService.getInstance().getDb();
  }

  /**
   * Get the default lower third animation config using constants
   */
  private getDefaultLowerThirdAnimation(): DbTheme["lowerThirdAnimation"] {
    return {
      timing: {
        logoFadeDuration: LOWER_THIRD_ANIMATION.TIMING.LOGO_FADE_DURATION,
        logoScaleDuration: LOWER_THIRD_ANIMATION.TIMING.LOGO_SCALE_DURATION,
        flipDuration: LOWER_THIRD_ANIMATION.TIMING.FLIP_DURATION,
        flipDelay: LOWER_THIRD_ANIMATION.TIMING.FLIP_DELAY,
        barAppearDelay: LOWER_THIRD_ANIMATION.TIMING.BAR_APPEAR_DELAY,
        barExpandDuration: LOWER_THIRD_ANIMATION.TIMING.BAR_EXPAND_DURATION,
        textAppearDelay: LOWER_THIRD_ANIMATION.TIMING.TEXT_APPEAR_DELAY,
        textFadeDuration: LOWER_THIRD_ANIMATION.TIMING.TEXT_FADE_DURATION,
      },
      styles: {
        barBorderRadius: LOWER_THIRD_ANIMATION.STYLES.BAR_BORDER_RADIUS,
        barMinWidth: LOWER_THIRD_ANIMATION.STYLES.BAR_MIN_WIDTH,
        avatarBorderWidth: LOWER_THIRD_ANIMATION.STYLES.AVATAR_BORDER_WIDTH,
        avatarBorderColor: LOWER_THIRD_ANIMATION.STYLES.AVATAR_BORDER_COLOR,
      },
    };
  }

  /**
   * Parse a raw database row into a DbTheme object
   */
  private parseRow(row: DbThemeRow): DbTheme {
    const defaultColors: DbTheme["colors"] = {
      primary: "#000000",
      accent: "#ffffff",
      surface: "#333333",
      text: "#ffffff",
      success: "#00ff00",
      warn: "#ff0000",
    };
    const defaultFont: DbTheme["lowerThirdFont"] = {
      family: "Arial",
      size: 16,
      weight: 400,
    };
    const defaultLayout: DbTheme["lowerThirdLayout"] = LAYOUT_DEFAULTS.LOWER_THIRD;
    const defaultAnimation = this.getDefaultLowerThirdAnimation();

    return {
      ...row,
      colors: safeJsonParse<DbTheme["colors"]>(row.colors, defaultColors),
      lowerThirdFont: safeJsonParse<DbTheme["lowerThirdFont"]>(
        row.lowerThirdFont,
        defaultFont
      ),
      lowerThirdLayout: safeJsonParse<DbTheme["lowerThirdLayout"]>(
        row.lowerThirdLayout,
        defaultLayout
      ),
      lowerThirdAnimation: safeJsonParse<DbTheme["lowerThirdAnimation"]>(
        row.lowerThirdAnimation,
        defaultAnimation
      ),
      countdownFont: safeJsonParse<DbTheme["countdownFont"]>(
        row.countdownFont,
        defaultFont
      ),
      countdownLayout: safeJsonParse<DbTheme["countdownLayout"]>(
        row.countdownLayout,
        LAYOUT_DEFAULTS.COUNTDOWN
      ),
      posterLayout: safeJsonParse<DbTheme["posterLayout"]>(
        row.posterLayout,
        LAYOUT_DEFAULTS.POSTER
      ),
      isGlobal: Boolean(row.isGlobal),
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    };
  }

  /**
   * Get all themes
   */
  getAll(): DbTheme[] {
    const stmt = this.db.prepare(
      "SELECT * FROM themes ORDER BY isGlobal DESC, name ASC"
    );
    const rows = stmt.all() as DbThemeRow[];
    return rows.map((row) => this.parseRow(row));
  }

  /**
   * Get theme by ID
   */
  getById(id: string): DbTheme | null {
    const stmt = this.db.prepare("SELECT * FROM themes WHERE id = ?");
    const row = stmt.get(id) as DbThemeRow | undefined;
    if (!row) return null;
    return this.parseRow(row);
  }

  /**
   * Create a new theme
   */
  create(theme: DbThemeInput): void {
    const now = new Date();
    this.logger.debug("Creating theme", {
      id: theme.id,
      name: theme.name,
      isGlobal: theme.isGlobal,
    });

    const stmt = this.db.prepare(`
      INSERT INTO themes (id, name, colors, lowerThirdTemplate, lowerThirdFont, lowerThirdLayout, lowerThirdAnimation, countdownStyle, countdownFont, countdownLayout, posterLayout, isGlobal, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      theme.id,
      theme.name,
      JSON.stringify(theme.colors),
      theme.lowerThirdTemplate,
      JSON.stringify(theme.lowerThirdFont),
      JSON.stringify(theme.lowerThirdLayout || LAYOUT_DEFAULTS.LOWER_THIRD),
      JSON.stringify(theme.lowerThirdAnimation || this.getDefaultLowerThirdAnimation()),
      theme.countdownStyle,
      JSON.stringify(theme.countdownFont),
      JSON.stringify(theme.countdownLayout || LAYOUT_DEFAULTS.COUNTDOWN),
      JSON.stringify(theme.posterLayout || LAYOUT_DEFAULTS.POSTER),
      theme.isGlobal ? 1 : 0,
      (theme.createdAt || now).toISOString(),
      (theme.updatedAt || now).toISOString()
    );

    this.logger.debug("Theme created successfully");
  }

  /**
   * Update a theme
   */
  update(id: string, updates: DbThemeUpdate): void {
    this.logger.debug("Updating theme", { id, name: updates.name });

    const stmt = this.db.prepare(`
      UPDATE themes
      SET name = ?, colors = ?, lowerThirdTemplate = ?, lowerThirdFont = ?, lowerThirdLayout = ?, lowerThirdAnimation = ?, countdownStyle = ?, countdownFont = ?, countdownLayout = ?, posterLayout = ?, isGlobal = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      updates.name,
      JSON.stringify(updates.colors),
      updates.lowerThirdTemplate,
      JSON.stringify(updates.lowerThirdFont),
      JSON.stringify(updates.lowerThirdLayout || LAYOUT_DEFAULTS.LOWER_THIRD),
      JSON.stringify(updates.lowerThirdAnimation || this.getDefaultLowerThirdAnimation()),
      updates.countdownStyle,
      JSON.stringify(updates.countdownFont),
      JSON.stringify(updates.countdownLayout || LAYOUT_DEFAULTS.COUNTDOWN),
      JSON.stringify(updates.posterLayout || LAYOUT_DEFAULTS.POSTER),
      updates.isGlobal ? 1 : 0,
      (updates.updatedAt || new Date()).toISOString(),
      id
    );
  }

  /**
   * Delete a theme
   */
  delete(id: string): void {
    const stmt = this.db.prepare("DELETE FROM themes WHERE id = ?");
    stmt.run(id);
  }
}

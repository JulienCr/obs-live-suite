import { BaseRepository, ColumnTransformConfig } from "./BaseRepository";
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
 * Default values for theme JSON fields
 */
const DEFAULT_COLORS: DbTheme["colors"] = {
  primary: "#000000",
  accent: "#ffffff",
  surface: "#333333",
  text: "#ffffff",
  success: "#00ff00",
  warn: "#ff0000",
};

const DEFAULT_FONT: DbTheme["lowerThirdFont"] = {
  family: "Arial",
  size: 16,
  weight: 400,
};

/**
 * ThemeRepository handles all theme-related database operations.
 * Uses singleton pattern for consistent database access.
 */
export class ThemeRepository extends BaseRepository<
  DbTheme,
  DbThemeRow,
  DbThemeInput,
  DbThemeUpdate
> {
  private static instance: ThemeRepository;

  protected readonly tableName = "themes";
  protected readonly loggerName = "ThemeRepository";

  /**
   * Transform configuration for theme columns.
   * Uses getter to avoid referencing `this` in field initializer.
   */
  protected get transformConfig(): ColumnTransformConfig {
    return {
      booleanColumns: ["isGlobal"],
      dateColumns: ["createdAt", "updatedAt"],
      jsonColumns: [
        { column: "colors", defaultValue: DEFAULT_COLORS },
        { column: "lowerThirdFont", defaultValue: DEFAULT_FONT },
        { column: "lowerThirdLayout", defaultValue: LAYOUT_DEFAULTS.LOWER_THIRD },
        { column: "lowerThirdAnimation", defaultValue: this.getDefaultLowerThirdAnimation(), optional: true },
        { column: "countdownFont", defaultValue: DEFAULT_FONT },
        { column: "countdownLayout", defaultValue: LAYOUT_DEFAULTS.COUNTDOWN },
        { column: "posterLayout", defaultValue: LAYOUT_DEFAULTS.POSTER },
      ],
    };
  }

  private constructor() {
    super();
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

  protected override getOrderBy(): string {
    return "isGlobal DESC, name ASC";
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
   * Create a new theme
   */
  create(theme: DbThemeInput): void {
    const now = new Date();
    this.getLogger().debug("Creating theme", {
      id: theme.id,
      name: theme.name,
      isGlobal: theme.isGlobal,
    });

    const stmt = this.rawDb.prepare(`
      INSERT INTO themes (id, name, colors, lowerThirdTemplate, lowerThirdFont, lowerThirdLayout, lowerThirdAnimation, countdownStyle, countdownFont, countdownLayout, posterLayout, isGlobal, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      theme.id,
      theme.name,
      this.prepareValue(theme.colors),
      theme.lowerThirdTemplate,
      this.prepareValue(theme.lowerThirdFont),
      this.prepareValue(theme.lowerThirdLayout || LAYOUT_DEFAULTS.LOWER_THIRD),
      this.prepareValue(theme.lowerThirdAnimation || this.getDefaultLowerThirdAnimation()),
      theme.countdownStyle,
      this.prepareValue(theme.countdownFont),
      this.prepareValue(theme.countdownLayout || LAYOUT_DEFAULTS.COUNTDOWN),
      this.prepareValue(theme.posterLayout || LAYOUT_DEFAULTS.POSTER),
      this.prepareValue(theme.isGlobal),
      this.prepareValue(theme.createdAt || now),
      this.prepareValue(theme.updatedAt || now)
    );

    this.getLogger().debug("Theme created successfully");
  }

  /**
   * Update a theme
   */
  update(id: string, updates: DbThemeUpdate): void {
    this.getLogger().debug("Updating theme", { id, name: updates.name });

    const stmt = this.rawDb.prepare(`
      UPDATE themes
      SET name = ?, colors = ?, lowerThirdTemplate = ?, lowerThirdFont = ?, lowerThirdLayout = ?, lowerThirdAnimation = ?, countdownStyle = ?, countdownFont = ?, countdownLayout = ?, posterLayout = ?, isGlobal = ?, updatedAt = ?
      WHERE id = ?
    `);
    stmt.run(
      updates.name,
      this.prepareValue(updates.colors),
      updates.lowerThirdTemplate,
      this.prepareValue(updates.lowerThirdFont),
      this.prepareValue(updates.lowerThirdLayout || LAYOUT_DEFAULTS.LOWER_THIRD),
      this.prepareValue(updates.lowerThirdAnimation || this.getDefaultLowerThirdAnimation()),
      updates.countdownStyle,
      this.prepareValue(updates.countdownFont),
      this.prepareValue(updates.countdownLayout || LAYOUT_DEFAULTS.COUNTDOWN),
      this.prepareValue(updates.posterLayout || LAYOUT_DEFAULTS.POSTER),
      this.prepareValue(updates.isGlobal),
      this.prepareValue(updates.updatedAt || new Date()),
      id
    );
  }
}

import { z } from "zod";

/**
 * Color scheme for themes
 */
export const colorSchemaSchema = z.object({
  primary: z.string().regex(/^#[0-9A-F]{6}$/i),
  accent: z.string().regex(/^#[0-9A-F]{6}$/i),
  surface: z.string().regex(/^#[0-9A-F]{6}$/i),
  text: z.string().regex(/^#[0-9A-F]{6}$/i),
  success: z.string().regex(/^#[0-9A-F]{6}$/i),
  warn: z.string().regex(/^#[0-9A-F]{6}$/i),
});

export type ColorScheme = z.infer<typeof colorSchemaSchema>;

/**
 * Font configuration
 */
export const fontConfigSchema = z.object({
  family: z.string(),
  size: z.number().int().positive(),
  weight: z.number().int().min(100).max(900),
});

export type FontConfig = z.infer<typeof fontConfigSchema>;

/**
 * Lower third template types
 */
export enum LowerThirdTemplate {
  CLASSIC = "classic",
  BAR = "bar",
  CARD = "card",
  SLIDE = "slide",
}

/**
 * Countdown style types
 */
export enum CountdownStyle {
  BOLD = "bold",
  CORNER = "corner",
  BANNER = "banner",
}

/**
 * Theme schema
 */
export const themeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Theme name is required").max(100),
  colors: colorSchemaSchema,
  lowerThirdTemplate: z.nativeEnum(LowerThirdTemplate),
  lowerThirdFont: fontConfigSchema,
  countdownStyle: z.nativeEnum(CountdownStyle),
  countdownFont: fontConfigSchema,
  isGlobal: z.boolean().default(false),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});

/**
 * Theme type inferred from schema
 */
export type Theme = z.infer<typeof themeSchema>;

/**
 * Create theme input schema
 */
export const createThemeSchema = themeSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateThemeInput = z.infer<typeof createThemeSchema>;

/**
 * Update theme input schema
 */
export const updateThemeSchema = themeSchema.partial().required({ id: true });

export type UpdateThemeInput = z.infer<typeof updateThemeSchema>;

/**
 * Theme class with business logic
 */
export class ThemeModel {
  private data: Theme;

  constructor(data: Theme) {
    this.data = themeSchema.parse(data);
  }

  /**
   * Get theme ID
   */
  getId(): string {
    return this.data.id;
  }

  /**
   * Get theme name
   */
  getName(): string {
    return this.data.name;
  }

  /**
   * Get color scheme
   */
  getColors(): ColorScheme {
    return { ...this.data.colors };
  }

  /**
   * Get lower third template
   */
  getLowerThirdTemplate(): LowerThirdTemplate {
    return this.data.lowerThirdTemplate;
  }

  /**
   * Get countdown style
   */
  getCountdownStyle(): CountdownStyle {
    return this.data.countdownStyle;
  }

  /**
   * Check if this is a global theme
   */
  isGlobalTheme(): boolean {
    return this.data.isGlobal;
  }

  /**
   * Update theme data
   */
  update(updates: Partial<Omit<Theme, "id" | "createdAt">>): void {
    this.data = {
      ...this.data,
      ...updates,
      updatedAt: new Date(),
    };
  }

  /**
   * Convert to plain object
   */
  toJSON(): Theme {
    return { ...this.data };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: unknown): ThemeModel {
    const parsed = themeSchema.parse(data);
    return new ThemeModel(parsed);
  }
}


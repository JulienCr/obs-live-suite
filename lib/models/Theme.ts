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
 * Layout configuration for overlays
 */
export const layoutConfigSchema = z.object({
  x: z.number().default(60),
  y: z.number().default(0),
  width: z.number().optional(),
  height: z.number().optional(),
  scale: z.number().min(0.5).max(2).default(1),
});

export type LayoutConfig = z.infer<typeof layoutConfigSchema>;

/**
 * Lower third animation configuration
 */
export const lowerThirdAnimationThemeSchema = z.object({
  timing: z.object({
    logoFadeDuration: z.number().positive().default(200),
    logoScaleDuration: z.number().positive().default(200),
    flipDuration: z.number().positive().default(600),
    flipDelay: z.number().positive().default(500),
    barAppearDelay: z.number().positive().default(800),
    barExpandDuration: z.number().positive().default(450),
    textAppearDelay: z.number().positive().default(1000),
    textFadeDuration: z.number().positive().default(250),
  }).default({
    logoFadeDuration: 200,
    logoScaleDuration: 200,
    flipDuration: 600,
    flipDelay: 500,
    barAppearDelay: 800,
    barExpandDuration: 450,
    textAppearDelay: 1000,
    textFadeDuration: 250,
  }),
  styles: z.object({
    barBorderRadius: z.number().positive().default(16),
    barMinWidth: z.number().positive().default(200),
    avatarBorderWidth: z.number().positive().default(4),
    avatarBorderColor: z.string().default('#272727'),
    freeTextMaxWidth: z.object({
      left: z.number().min(10).max(100).default(65),    // Percentage for left position
      right: z.number().min(10).max(100).default(65),   // Percentage for right position
      center: z.number().min(10).max(100).default(90),  // Percentage for center position
    }).optional().default({
      left: 65,
      right: 65,
      center: 90,
    }),
  }).default({
    barBorderRadius: 16,
    barMinWidth: 200,
    avatarBorderWidth: 4,
    avatarBorderColor: '#272727',
    freeTextMaxWidth: {
      left: 65,
      right: 65,
      center: 90,
    },
  }),
  colors: z.object({
    titleColor: z.string().optional(),
    subtitleColor: z.string().optional(),
    barBgColor: z.string().optional(),
  }).optional(),
}).default({
  timing: {
    logoFadeDuration: 200,
    logoScaleDuration: 200,
    flipDuration: 600,
    flipDelay: 500,
    barAppearDelay: 800,
    barExpandDuration: 450,
    textAppearDelay: 1000,
    textFadeDuration: 250,
  },
  styles: {
    barBorderRadius: 16,
    barMinWidth: 200,
    avatarBorderWidth: 4,
    avatarBorderColor: '#272727',
    freeTextMaxWidth: {
      left: 65,
      right: 65,
      center: 90,
    },
  },
});

export type LowerThirdAnimationTheme = z.infer<typeof lowerThirdAnimationThemeSchema>;

/**
 * Theme schema
 */
export const themeSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Theme name is required").max(100),
  colors: colorSchemaSchema,
  lowerThirdTemplate: z.nativeEnum(LowerThirdTemplate),
  lowerThirdFont: fontConfigSchema,
  lowerThirdLayout: layoutConfigSchema.default({ x: 60, y: 920, scale: 1 }),
  lowerThirdAnimation: lowerThirdAnimationThemeSchema,
  countdownStyle: z.nativeEnum(CountdownStyle),
  countdownFont: fontConfigSchema,
  countdownLayout: layoutConfigSchema.default({ x: 960, y: 540, scale: 1 }),
  posterLayout: layoutConfigSchema.default({ x: 960, y: 540, scale: 1 }), // x is horizontal offset from center
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


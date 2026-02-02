import { v4 as uuidv4 } from "uuid";
import { ThemeRepository } from "@/lib/repositories/ThemeRepository";
import { Logger } from "../utils/Logger";
import {
  Theme,
  ThemeModel,
  LowerThirdTemplate,
  CountdownStyle,
} from "../models/Theme";
import { LAYOUT_DEFAULTS, LOWER_THIRD_ANIMATION } from "../config/Constants";

/**
 * ThemeService handles theme management and default themes
 */
export class ThemeService {
  private static instance: ThemeService;
  private themeRepo: ThemeRepository;
  private logger: Logger;
  private defaultThemeIds: Map<string, string> = new Map();

  private constructor() {
    this.themeRepo = ThemeRepository.getInstance();
    this.logger = new Logger("ThemeService");
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ThemeService {
    if (!ThemeService.instance) {
      ThemeService.instance = new ThemeService();
    }
    return ThemeService.instance;
  }

  /**
   * Initialize default themes if they don't exist
   * This runs on server startup and ensures defaults are always available
   */
  async initializeDefaultThemes(): Promise<void> {
    this.logger.info("Initializing default themes...");

    const defaultThemes = this.getDefaultThemeDefinitions();

    for (const theme of defaultThemes) {
      try {
        // Check if theme with this name already exists
        const existingThemes = this.themeRepo.getAll();
        const exists = existingThemes.find(
          (t) => t.name === theme.name && t.isGlobal
        );

        if (!exists) {
          const themeModel = new ThemeModel({
            id: uuidv4(),
            ...theme,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          this.themeRepo.create(themeModel.toJSON());
          this.defaultThemeIds.set(theme.name, themeModel.getId());
          this.logger.info(`✓ Created default theme: ${theme.name}`);
        } else {
          this.defaultThemeIds.set(theme.name, exists.id);
          this.logger.info(`✓ Default theme exists: ${theme.name}`);
        }
      } catch (error) {
        this.logger.error(`Failed to create default theme ${theme.name}:`, error);
      }
    }

    this.logger.info(`✓ ${this.defaultThemeIds.size} default themes available`);
  }
  
  /**
   * Ensure default themes exist (can be called anytime)
   */
  ensureDefaultThemes(): void {
    const themes = this.themeRepo.getAll();
    if (themes.length === 0) {
      this.logger.warn("No themes found, reinitializing defaults");
      this.initializeDefaultThemes();
    }
  }

  /**
   * Get the default theme ID for profiles
   */
  getDefaultThemeId(): string {
    const defaultId = this.defaultThemeIds.get("Modern Blue");
    if (defaultId) return defaultId;

    // Fallback: get any theme
    const themes = this.themeRepo.getAll();
    if (themes.length > 0) {
      return themes[0].id;
    }

    throw new Error("No themes available");
  }

  /**
   * Get default theme definitions
   */
  private getDefaultThemeDefinitions() {
    const defaultAnimation = {
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
        freeTextMaxWidth: {
          left: LOWER_THIRD_ANIMATION.STYLES.FREE_TEXT_MAX_WIDTH.left,
          right: LOWER_THIRD_ANIMATION.STYLES.FREE_TEXT_MAX_WIDTH.right,
          center: LOWER_THIRD_ANIMATION.STYLES.FREE_TEXT_MAX_WIDTH.center,
        },
      },
    };

    return [
      {
        name: "Modern Blue",
        colors: {
          primary: "#3B82F6",
          accent: "#60A5FA",
          surface: "#1E293B",
          text: "#F8FAFC",
          success: "#10B981",
          warn: "#F59E0B",
        },
        lowerThirdTemplate: LowerThirdTemplate.CLASSIC,
        lowerThirdFont: {
          family: "Inter, sans-serif",
          size: 28,
          weight: 700,
        },
        lowerThirdLayout: LAYOUT_DEFAULTS.LOWER_THIRD,
        lowerThirdAnimation: defaultAnimation,
        countdownStyle: CountdownStyle.BOLD,
        countdownFont: {
          family: "Courier New, monospace",
          size: 80,
          weight: 900,
        },
        countdownLayout: LAYOUT_DEFAULTS.COUNTDOWN,
        posterLayout: LAYOUT_DEFAULTS.POSTER,
        isGlobal: true,
      },
      {
        name: "Vibrant Purple",
        colors: {
          primary: "#8B5CF6",
          accent: "#A78BFA",
          surface: "#1E1B4B",
          text: "#F5F3FF",
          success: "#10B981",
          warn: "#F59E0B",
        },
        lowerThirdTemplate: LowerThirdTemplate.BAR,
        lowerThirdFont: {
          family: "Inter, sans-serif",
          size: 26,
          weight: 600,
        },
        lowerThirdLayout: LAYOUT_DEFAULTS.LOWER_THIRD,
        lowerThirdAnimation: defaultAnimation,
        countdownStyle: CountdownStyle.CORNER,
        countdownFont: {
          family: "Courier New, monospace",
          size: 48,
          weight: 900,
        },
        countdownLayout: { x: 1780, y: 40, scale: 1 }, // Corner position override
        posterLayout: LAYOUT_DEFAULTS.POSTER,
        isGlobal: true,
      },
      {
        name: "Elegant Red",
        colors: {
          primary: "#EF4444",
          accent: "#F87171",
          surface: "#450A0A",
          text: "#FEF2F2",
          success: "#10B981",
          warn: "#F59E0B",
        },
        lowerThirdTemplate: LowerThirdTemplate.CARD,
        lowerThirdFont: {
          family: "Georgia, serif",
          size: 30,
          weight: 700,
        },
        lowerThirdLayout: LAYOUT_DEFAULTS.LOWER_THIRD,
        lowerThirdAnimation: defaultAnimation,
        countdownStyle: CountdownStyle.BANNER,
        countdownFont: {
          family: "Courier New, monospace",
          size: 64,
          weight: 900,
        },
        countdownLayout: { x: 960, y: 40, scale: 1 }, // Banner position override
        posterLayout: LAYOUT_DEFAULTS.POSTER,
        isGlobal: true,
      },
      {
        name: "Clean Green",
        colors: {
          primary: "#10B981",
          accent: "#34D399",
          surface: "#064E3B",
          text: "#ECFDF5",
          success: "#10B981",
          warn: "#F59E0B",
        },
        lowerThirdTemplate: LowerThirdTemplate.SLIDE,
        lowerThirdFont: {
          family: "Inter, sans-serif",
          size: 28,
          weight: 700,
        },
        lowerThirdLayout: { x: 1860, y: 920, scale: 1 }, // Slide position override
        lowerThirdAnimation: defaultAnimation,
        countdownStyle: CountdownStyle.BOLD,
        countdownFont: {
          family: "Courier New, monospace",
          size: 80,
          weight: 900,
        },
        countdownLayout: LAYOUT_DEFAULTS.COUNTDOWN,
        posterLayout: LAYOUT_DEFAULTS.POSTER,
        isGlobal: true,
      },
      {
        name: "Dark Mode",
        colors: {
          primary: "#64748B",
          accent: "#94A3B8",
          surface: "#0F172A",
          text: "#F1F5F9",
          success: "#10B981",
          warn: "#F59E0B",
        },
        lowerThirdTemplate: LowerThirdTemplate.CLASSIC,
        lowerThirdFont: {
          family: "Inter, sans-serif",
          size: 28,
          weight: 700,
        },
        lowerThirdLayout: LAYOUT_DEFAULTS.LOWER_THIRD,
        lowerThirdAnimation: defaultAnimation,
        countdownStyle: CountdownStyle.CORNER,
        countdownFont: {
          family: "Courier New, monospace",
          size: 48,
          weight: 900,
        },
        countdownLayout: { x: 1780, y: 40, scale: 1 }, // Corner position override
        posterLayout: LAYOUT_DEFAULTS.POSTER,
        isGlobal: true,
      },
    ];
  }
}


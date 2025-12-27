/**
 * Theme Enrichment Utility
 * Shared logic for enriching overlay payloads with active theme data
 */

import { DatabaseService } from "../services/DatabaseService";
import { Theme } from "../models/Theme";
import { DbProfile } from "../models/Database";

export interface LowerThirdThemeData {
  colors: Theme["colors"];
  template: Theme["lowerThirdTemplate"];
  font: Theme["lowerThirdFont"];
  layout: Theme["lowerThirdLayout"];
  lowerThirdAnimation: Theme["lowerThirdAnimation"];
}

export interface CountdownThemeData {
  colors: Theme["colors"];
  style: Theme["countdownStyle"];
  font: Theme["countdownFont"];
  layout: Theme["countdownLayout"];
}

export interface PosterThemeData {
  layout: Theme["posterLayout"];
}

/**
 * Get the active theme from the database
 * @param db DatabaseService instance (optional, will create if not provided)
 * @returns Theme object or null if not found
 */
export function getActiveTheme(db?: DatabaseService): Theme | null {
  try {
    const dbInstance = db || DatabaseService.getInstance();
    const activeProfile = dbInstance.getActiveProfile();
    
    if (!activeProfile || !activeProfile.themeId) {
      console.log("[ThemeEnrichment] No active profile or themeId found");
      return null;
    }
    
    const theme = dbInstance.getThemeById(activeProfile.themeId) as Theme;
    if (theme) {
      console.log("[ThemeEnrichment] Found theme:", theme.name, "ID:", theme.id);
    } else {
      console.log("[ThemeEnrichment] Theme not found for ID:", activeProfile.themeId);
    }
    
    return theme;
  } catch (error) {
    console.error("[ThemeEnrichment] Failed to get active theme:", error);
    return null;
  }
}

/**
 * Extract lower third theme data from a Theme object
 * @param theme Theme object
 * @returns LowerThirdThemeData or undefined
 */
export function getLowerThirdThemeData(theme: Theme | null): LowerThirdThemeData | undefined {
  if (!theme) return undefined;
  
  return {
    colors: theme.colors,
    template: theme.lowerThirdTemplate,
    font: theme.lowerThirdFont,
    layout: theme.lowerThirdLayout,
    lowerThirdAnimation: theme.lowerThirdAnimation,
  };
}

/**
 * Extract countdown theme data from a Theme object
 * @param theme Theme object
 * @returns CountdownThemeData or undefined
 */
export function getCountdownThemeData(theme: Theme | null): CountdownThemeData | undefined {
  if (!theme) return undefined;
  
  return {
    colors: theme.colors,
    style: theme.countdownStyle,
    font: theme.countdownFont,
    layout: theme.countdownLayout,
  };
}

/**
 * Extract poster theme data from a Theme object
 * @param theme Theme object
 * @returns PosterThemeData or undefined
 */
export function getPosterThemeData(theme: Theme | null): PosterThemeData | undefined {
  if (!theme) return undefined;
  
  return {
    layout: theme.posterLayout,
  };
}

/**
 * Enrich a lower third payload with active theme data
 * @param payload Existing payload
 * @param db DatabaseService instance (optional)
 * @returns Enriched payload with theme data
 */
export function enrichLowerThirdPayload<T extends Record<string, unknown>>(
  payload: T,
  db?: DatabaseService
): T & { theme?: LowerThirdThemeData } {
  const theme = getActiveTheme(db);
  const themeData = getLowerThirdThemeData(theme);
  
  return {
    ...payload,
    theme: themeData,
  };
}

/**
 * Enrich a countdown payload with active theme data
 * @param payload Existing payload
 * @param db DatabaseService instance (optional)
 * @returns Enriched payload with theme data
 */
export function enrichCountdownPayload<T extends Record<string, unknown>>(
  payload: T,
  db?: DatabaseService
): T & { theme?: CountdownThemeData } {
  const theme = getActiveTheme(db);
  const themeData = getCountdownThemeData(theme);
  
  return {
    ...payload,
    theme: themeData,
  };
}

/**
 * Enrich a poster payload with active theme data
 * @param payload Existing payload
 * @param db DatabaseService instance (optional)
 * @returns Enriched payload with theme data
 */
export function enrichPosterPayload<T extends Record<string, unknown>>(
  payload: T,
  db?: DatabaseService
): T & { theme?: PosterThemeData } {
  const theme = getActiveTheme(db);
  const themeData = getPosterThemeData(theme);
  
  return {
    ...payload,
    theme: themeData,
  };
}


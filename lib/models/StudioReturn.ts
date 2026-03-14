import { z } from "zod";
import type { CueSeverity } from "./Cue";

/**
 * Monitor information reported by the Tauri app.
 * Validated on input from the Tauri app POST endpoint.
 */
export const MonitorInfoSchema = z.object({
  index: z.number().int().min(0),
  name: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  x: z.number().int(),
  y: z.number().int(),
  isPrimary: z.boolean(),
});

export type MonitorInfo = z.infer<typeof MonitorInfoSchema>;

/**
 * Studio Return overlay settings schema
 */
export const StudioReturnSettingsSchema = z.object({
  monitorIndex: z.number().int().min(0).default(0),
  displayDuration: z.number().min(3).max(60).default(10),
  fontSize: z.number().min(32).max(160).default(80),
  enabled: z.boolean().default(true),
});

export type StudioReturnSettings = z.infer<typeof StudioReturnSettingsSchema>;

export const DEFAULT_STUDIO_RETURN_SETTINGS: StudioReturnSettings =
  StudioReturnSettingsSchema.parse({});

/** WebSocket message type for real-time settings push */
export const STUDIO_RETURN_SETTINGS_EVENT = "studio-return-settings" as const;

/** Content displayed on the Studio Return overlay */
export interface StudioReturnContent {
  title: string;
  body: string;
  severity: CueSeverity;
}

/** Delay (ms) before auto-dismissing a countdown that reached zero */
export const COUNTDOWN_ZERO_DISMISS_MS = 3000;
